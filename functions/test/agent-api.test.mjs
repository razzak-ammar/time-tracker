import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { createAgentApiHandler } from "../lib/agent-api.js";

const startTime = "2026-11-01T09:00:00-05:00";
const endTime = "2026-11-01T10:00:00-05:00";
const { indexes } = JSON.parse(readFileSync(new URL("../../firestore.indexes.json", import.meta.url), "utf8"));

// Production queries must be served by a deployed index: equality-only queries
// use automatic single-field indexes; anything ordered needs a composite one.
function assertIndexed(collection, filters, orders) {
  const equalities = filters.filter(([, op]) => op === "==").map(([field]) => field);
  const ranges = [...new Set(filters.filter(([, op]) => op !== "==").map(([field]) => field))];
  const sorted = orders.filter(([field]) => field !== "__name__");
  if (ranges.length) assert.equal(sorted[0]?.[0], ranges[0], "range field must be the first orderBy");
  const name = orders.find(([field]) => field === "__name__");
  if (name && sorted.length) assert.equal(name[1], sorted.at(-1)[1], "__name__ must follow the last order direction");
  if (!sorted.length) return;
  const covered = indexes.some(({ collectionGroup, fields }) => collectionGroup === collection &&
    fields.length === equalities.length + sorted.length &&
    equalities.every((field) => fields.slice(0, equalities.length).some((f) => f.fieldPath === field)) &&
    sorted.every(([field, direction], i) => fields[equalities.length + i].fieldPath === field &&
      fields[equalities.length + i].order === (direction === "desc" ? "DESCENDING" : "ASCENDING")));
  assert.ok(covered, `No index for ${collection} ${JSON.stringify({ equalities, sorted })}`);
}

function compare(a, b) {
  if (a instanceof Timestamp) return a.toMillis() - b.toMillis() || a.nanoseconds % 1e6 - b.nanoseconds % 1e6;
  return a < b ? -1 : a > b ? 1 : 0;
}

// In-memory Firestore boundary: exercise the complete HTTP handler without
// credentials/network. Queued transaction writes commit only after success.
function fixture() {
  const documents = new Map([
    ["projects/p1", { userId: "alice", name: "Work", color: "#112233", isPinned: false }],
    ["projects/other", { userId: "bob", name: "Private", color: "#112233" }],
    ["projects/trash", { userId: "alice", deletedAt: Timestamp.now() }],
  ]);
  const queries = [];
  function ref(path) {
    return { path, id: path.split("/").at(-1), get: async () => snapshot(path) };
  }
  function snapshot(path) {
    const data = () => documents.get(path);
    return { id: path.split("/").at(-1), exists: documents.has(path), data, get: (field) => data()?.[field], ref: ref(path) };
  }
  function query(name, state = { filters: [], orders: [], count: Infinity, after: undefined }) {
    const next = (change) => query(name, { ...state, ...change });
    const value = (doc, field) => field === "__name__" ? doc.id : doc.data()[field];
    return {
      doc: (id) => ref(`${name}/${id}`),
      where: (field, op, value) => {
        assert.ok(["==", ">=", "<"].includes(op));
        return next({ filters: [...state.filters, [field, op, value]] });
      },
      orderBy: (field, direction = "asc") => next({
        orders: [...state.orders, [field instanceof FieldPath && field.isEqual(FieldPath.documentId()) ? "__name__" : field, direction]],
      }),
      limit: (count) => next({ count }),
      startAfter: (...after) => next({ after }),
      async get() {
        assertIndexed(name, state.filters, state.orders);
        queries.push(state);
        const orders = state.orders.some(([field]) => field === "__name__")
          ? state.orders : [...state.orders, ["__name__", state.orders.at(-1)?.[1] ?? "asc"]];
        const position = (doc, values) => {
          for (const [i, [field, direction]] of orders.slice(0, values.length).entries()) {
            const order = compare(value(doc, field), values[i]) * (direction === "desc" ? -1 : 1);
            if (order) return order;
          }
          return 0;
        };
        const docs = [...documents.keys()].filter((path) => path.startsWith(`${name}/`)).map(snapshot)
          .filter((doc) => orders.every(([field]) => value(doc, field) !== undefined))
          .filter((doc) => state.filters.every(([field, op, expected]) => {
            const actual = doc.data()[field];
            if (op === "==") return actual === expected;
            if (!(actual instanceof Timestamp)) return false;
            return op === ">=" ? compare(actual, expected) >= 0 : compare(actual, expected) < 0;
          }))
          .sort((a, b) => position(a, orders.map(([field]) => value(b, field))))
          .filter((doc) => state.after === undefined || position(doc, state.after) > 0)
          .slice(0, state.count);
        return { docs, size: docs.length };
      },
    };
  }
  const db = {
    collection: (name) => query(name),
    async runTransaction(fn) {
      const writes = [];
      const result = await fn({
        get: async (target) => target.path ? snapshot(target.path) : target.get(),
        create: (reference, data) => writes.push([reference.path, data]),
        update: (reference, data) => writes.push([reference.path, { ...documents.get(reference.path), ...data }]),
      });
      for (const [path, data] of writes) documents.set(path, data);
      return result;
    },
  };
  const handler = createAgentApiHandler(db, async (token) => {
    if (token !== "valid") throw new Error("revoked or expired");
    return { uid: "alice" };
  });
  async function request(method, path, body, query = {}, token = "valid", contentType = "application/json", headers = {}) {
    const req = {
      method, path, body, query,
      rawBody: Buffer.from(JSON.stringify(body ?? {})),
      get: (header) => header === "Authorization" ? (token ? `Bearer ${token}` : undefined) : headers[header],
      is: (type) => contentType === type,
    };
    const response = {
      statusCode: 200, headers: {}, body: undefined,
      set(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; },
      send() { return this; },
    };
    await handler(req, response);
    return response;
  }
  return { documents, queries, request };
}

/** Follows nextCursor like the Boop client, asserting cursors are URL-safe and never repeat. */
async function listAll(request, query) {
  const ids = [];
  const seen = new Set();
  for (let cursor; ;) {
    const page = await request("GET", "/events", undefined, { ...query, ...(cursor ? { cursor } : {}) });
    assert.equal(page.statusCode, 200, JSON.stringify(page.body));
    ids.push(...page.body.data.map((item) => item.id));
    if (page.body.nextCursor === null) return ids;
    assert.match(page.body.nextCursor, /^[A-Za-z0-9_-]+$/);
    assert.ok(!seen.has(page.body.nextCursor));
    seen.add(page.body.nextCursor);
    cursor = page.body.nextCursor;
  }
}

async function createEvent(request, body = {}) {
  return request("POST", "/events", { id: "e1", projectId: "p1", startTime, endTime, description: "Planning", ...body });
}

test("requires valid authentication before reading or mutating", async () => {
  const { request, documents } = fixture();
  for (const token of [null, "expired"]) {
    assert.equal((await request("GET", "/projects", undefined, {}, token)).statusCode, 401);
    assert.equal((await request("POST", "/events", {}, {}, token)).statusCode, 401);
  }
  assert.equal(documents.size, 3);
});

test("project list, get, create, and partial edit preserve ownership and audit fields", async () => {
  const { request, documents } = fixture();
  const list = await request("GET", "/projects");
  assert.deepEqual(list.body.data.map((item) => item.id), ["p1"]);
  const created = await request("POST", "/projects", { id: "new", name: "Agent", color: "#ABCDEF" });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.isPinned, false);
  assert.equal(documents.get("projects/new").userId, "alice");
  const createdAt = documents.get("projects/new").createdAt;
  assert.equal((await request("PATCH", "/projects/new", { name: "Updated", isPinned: true })).statusCode, 200);
  assert.equal(documents.get("projects/new").createdAt, createdAt);
  assert.equal((await request("GET", "/projects/new")).body.data.name, "Updated");
});

test("completed events round-trip timestamps, edit description and move projects", async () => {
  const { request, documents } = fixture();
  const result = await createEvent(request);
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.data.startTime, "2026-11-01T14:00:00.000Z");
  assert.equal(result.body.data.isActive, false);
  await request("POST", "/projects", { id: "p2", name: "Second", color: "#123456" });
  const updated = await request("PATCH", "/events/e1", { description: "", projectId: "p2" });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.data.description, "");
  assert.equal(documents.get("timeEntries/e1").projectId, "p2");
  assert.equal((await request("GET", "/events/e1")).statusCode, 200);
});

test("active timer can be started and stopped while invalid merged ranges are rejected", async () => {
  const { request } = fixture();
  assert.equal((await createEvent(request, { isActive: true, endTime: null })).statusCode, 201);
  assert.equal((await request("PATCH", "/events/e1", { isActive: false })).statusCode, 400);
  assert.equal((await request("PATCH", "/events/e1", { endTime })).statusCode, 400);
  assert.equal((await request("PATCH", "/events/e1", { isActive: false, endTime })).statusCode, 200);
  assert.equal((await request("PATCH", "/events/e1", { startTime: "2026-11-01T16:00:00Z" })).statusCode, 400);
});

test("cross-user access is hidden and cannot be used to associate an event", async () => {
  const { request, documents } = fixture();
  for (const method of ["GET", "PATCH"]) {
    assert.equal((await request(method, "/projects/other", { name: "Stolen" })).statusCode, 404);
  }
  documents.set("timeEntries/private", { userId: "bob", projectId: "other", description: "Secret" });
  for (const method of ["GET", "PATCH", "DELETE"]) {
    assert.equal((await request(method, "/events/private", { description: "Stolen" })).statusCode, 404);
  }
  assert.equal((await createEvent(request, { projectId: "other" })).statusCode, 404);
  assert.equal((await createEvent(request, { projectId: "missing" })).statusCode, 404);
  assert.equal(documents.get("timeEntries/private").description, "Secret");
  assert.equal(documents.has("timeEntries/e1"), false);
});

test("delete is retry-safe recoverable trash, hidden from normal lists and blocks edits", async () => {
  const { request, documents } = fixture();
  await createEvent(request);
  assert.equal((await request("DELETE", "/events/e1")).statusCode, 204);
  const trashed = documents.get("timeEntries/e1");
  assert.equal(trashed.purgeAt.toMillis() - trashed.deletedAt.toMillis(), 30 * 86400000);
  assert.equal((await request("DELETE", "/events/e1")).statusCode, 204);
  assert.equal(documents.get("timeEntries/e1").deletionId, trashed.deletionId);
  assert.deepEqual((await request("GET", "/events")).body.data, []);
  assert.equal((await request("GET", "/events", undefined, { includeDeleted: "true" })).body.data.length, 1);
  assert.ok((await request("GET", "/events/e1")).body.data.deletedAt);
  assert.equal((await request("PATCH", "/events/e1", { description: "edit" })).statusCode, 409);
  assert.equal((await createEvent(request, { id: "blocked", projectId: "trash" })).statusCode, 409);
});

test("lists push filters into indexed queries and page with stable opaque cursors", async () => {
  const { request, documents, queries } = fixture();
  await request("POST", "/projects", { id: "p2", name: "Second", color: "#123456" });
  const day = (date, hour, extra = {}) => ({
    startTime: `2026-11-${date}T${hour}:00:00Z`, endTime: `2026-11-${date}T${hour}:30:00Z`, ...extra,
  });
  await createEvent(request, { id: "a", ...day("01", 10) });
  await createEvent(request, { id: "b", ...day("02", 10) });
  await createEvent(request, { id: "c", ...day("02", 10) }); // same startTime as b: ID breaks the tie
  await createEvent(request, { id: "d", ...day("02", 12), projectId: "p2" });
  await createEvent(request, { id: "e", ...day("03", 10) });
  await createEvent(request, { id: "run", startTime: "2026-11-02T13:00:00Z", isActive: true, endTime: null });
  documents.set("timeEntries/bob", { userId: "bob", projectId: "other", isActive: true, startTime: Timestamp.fromMillis(Date.parse("2026-11-02T11:00:00Z")) });
  await request("DELETE", "/events/e");

  const range = { from: "2026-11-02T00:00:00Z", to: "2026-11-03T00:00:00Z" };
  for (const limit of ["1", "2", "200"]) {
    assert.deepEqual(await listAll(request, { limit }), ["run", "d", "c", "b", "a"]);
    assert.deepEqual(await listAll(request, { limit, ...range }), ["run", "d", "c", "b"]);
    assert.deepEqual(await listAll(request, { limit, ...range, projectId: "p1" }), ["run", "c", "b"]);
    assert.deepEqual(await listAll(request, { limit, ...range, isActive: "false" }), ["d", "c", "b"]);
    assert.deepEqual(await listAll(request, { limit, isActive: "true" }), ["run"]);
    assert.deepEqual(await listAll(request, { limit, isActive: "false" }), ["a", "b", "c", "d"]);
    assert.deepEqual(await listAll(request, { limit, includeDeleted: "true", from: "2026-11-03T00:00:00Z" }), ["e"]);
  }
  // from is inclusive, to exclusive.
  assert.deepEqual(await listAll(request, { from: "2026-11-02T10:00:00Z", to: "2026-11-02T12:00:00Z" }), ["c", "b"]);
  // Filters handled in memory can leave an empty page that still has a cursor.
  const first = await request("GET", "/events", undefined, { limit: "1", projectId: "p1", isActive: "false" });
  assert.deepEqual(first.body.data, []);
  assert.notEqual(first.body.nextCursor, null);
  // Every query was user-scoped and only isActive alone fell back to document-ID order.
  assert.ok(queries.every((q) => q.filters.some(([field, op, value]) => field === "userId" && op === "==" && value === "alice")));
  assert.ok(queries.filter((q) => q.orders[0]?.[0] === "startTime").every((q) => !q.filters.some(([field]) => field === "isActive")));
});

test("rejects tampered cursors and cursors from a differently ordered list", async () => {
  const { request } = fixture();
  await createEvent(request, { id: "a" });
  await createEvent(request, { id: "b", startTime: "2026-11-02T10:00:00Z", endTime: "2026-11-02T11:00:00Z" });
  const timeCursor = (await request("GET", "/events", undefined, { limit: "1" })).body.nextCursor;
  const idCursor = (await request("GET", "/events", undefined, { limit: "1", isActive: "false" })).body.nextCursor;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  for (const [query, cursor] of [
    [{}, idCursor], [{ isActive: "false" }, timeCursor], [{}, "a"], [{}, "bad/cursor"],
    [{}, encode(["t", 1.5, 0, "a"])], [{}, encode(["t", 1, 1e9, "a"])], [{}, encode(["t", 1, 0, "../a"])],
  ]) {
    const response = await request("GET", "/events", undefined, { ...query, cursor });
    assert.equal(response.statusCode, 400, cursor);
    assert.equal(response.body.error.code, "invalid_argument");
  }
  assert.equal((await request("GET", "/projects", undefined, { cursor: timeCursor })).statusCode, 400);
});

test("If-Match updatedAt preconditions guard patches and deletes without changing unconditional writes", async () => {
  const { request, documents } = fixture();
  const current = (await createEvent(request)).body.data.updatedAt;
  const stale = "2000-01-01T00:00:00.000Z";
  const patch = (path, body, ifMatch) => request("PATCH", path, body, {}, "valid", "application/json", ifMatch ? { "If-Match": ifMatch } : {});

  const rejected = await patch("/events/e1", { description: "lost update" }, stale);
  assert.equal(rejected.statusCode, 412);
  assert.equal(rejected.body.error.code, "precondition_failed");
  assert.equal(documents.get("timeEntries/e1").description, "Planning");
  assert.equal((await patch("/events/e1", { description: "quoted" }, `"${current}"`)).statusCode, 200);
  documents.get("timeEntries/e1").updatedAt = Timestamp.fromMillis(Date.parse("2026-11-01T12:00:00.123Z"));
  assert.equal((await patch("/events/e1", { description: "offset" }, "2026-11-01T07:00:00.123-05:00")).statusCode, 200);
  assert.equal((await patch("/events/e1", { description: "unconditional" })).statusCode, 200);
  assert.equal((await patch("/events/e1", { description: "any" }, "*")).statusCode, 200);
  assert.equal((await patch("/events/e1", { description: "bad" }, "yesterday")).statusCode, 400);

  documents.get("projects/p1").updatedAt = Timestamp.fromMillis(Date.parse("2026-11-01T00:00:00Z"));
  assert.equal((await patch("/projects/p1", { name: "Stale" }, stale)).statusCode, 412);
  assert.equal(documents.get("projects/p1").name, "Work");
  assert.equal((await patch("/projects/p1", { name: "Fresh" }, "2026-11-01T00:00:00.000Z")).statusCode, 200);

  const del = (ifMatch) => request("DELETE", "/events/e1", undefined, {}, "valid", "application/json", { "If-Match": ifMatch });
  assert.equal((await del(stale)).statusCode, 412);
  assert.equal(documents.get("timeEntries/e1").deletedAt, undefined);
  const before = documents.get("timeEntries/e1").updatedAt.toDate().toISOString();
  assert.equal((await del(before)).statusCode, 204);
  assert.ok(documents.get("timeEntries/e1").deletedAt);
  assert.equal((await del(before)).statusCode, 204); // retry after an ambiguous response
  documents.set("timeEntries/legacy", { userId: "alice", projectId: "p1", startTime: Timestamp.now(), isActive: false });
  assert.equal((await request("DELETE", "/events/legacy", undefined, {}, "valid", "application/json", { "If-Match": current })).statusCode, 412);
});

test("allows at most one non-deleted active timer per user", async () => {
  const { request, documents } = fixture();
  const timer = { isActive: true, endTime: null };
  documents.set("timeEntries/bob-timer", { userId: "bob", projectId: "other", isActive: true, startTime: Timestamp.now() });
  assert.equal((await createEvent(request, { id: "t1", ...timer })).statusCode, 201);
  const second = await createEvent(request, { id: "t2", ...timer });
  assert.equal(second.statusCode, 409);
  assert.equal(second.body.error.code, "active_timer_exists");
  assert.equal(documents.has("timeEntries/t2"), false);
  assert.equal((await createEvent(request, { id: "done" })).statusCode, 201);
  assert.equal((await request("PATCH", "/events/done", timer)).statusCode, 409);
  assert.equal(documents.get("timeEntries/done").isActive, false);
  assert.equal((await request("PATCH", "/events/t1", { ...timer, description: "same timer" })).statusCode, 200);
  assert.equal((await request("PATCH", "/events/t1", { description: "still running" })).statusCode, 200);
  assert.equal((await request("PATCH", "/events/t1", { isActive: false, endTime })).statusCode, 200);
  assert.equal((await request("PATCH", "/events/done", timer)).statusCode, 200);
  assert.equal((await request("DELETE", "/events/done")).statusCode, 204);
  assert.equal((await createEvent(request, { id: "t3", ...timer })).statusCode, 201); // trash does not block
});

test("caller IDs prevent duplicate creation on retries", async () => {
  const { request, documents } = fixture();
  assert.equal((await createEvent(request)).statusCode, 201);
  assert.equal((await createEvent(request)).statusCode, 409);
  assert.equal([...documents.keys()].filter((key) => key.startsWith("timeEntries/")).length, 1);
});

test("rejects ownership, audit and trash field injection, empty patches, and invalid bodies", async () => {
  const { request } = fixture();
  for (const field of ["userId", "createdAt", "updatedAt", "deletedAt", "purgeAt", "deletionId", "unexpected"]) {
    assert.equal((await createEvent(request, { [field]: "injected" })).statusCode, 400);
  }
  for (const body of [null, [], "text"]) assert.equal((await request("POST", "/events", body)).statusCode, 400);
  assert.equal((await request("PATCH", "/projects/p1", {})).statusCode, 400);
  assert.equal((await request("PATCH", "/projects/p1", { name: "  " })).statusCode, 400);
  assert.equal((await request("POST", "/projects", { name: "Name", color: "red" })).statusCode, 400);
  assert.equal((await request("POST", "/events", {}, {}, "valid", "text/plain")).statusCode, 415);
  assert.equal((await createEvent(request, { description: "a".repeat(33000) })).statusCode, 413);
});

test("rejects invalid time ranges, timestamps without timezone, malformed IDs, and oversized descriptions", async () => {
  const { request } = fixture();
  for (const body of [
    { endTime: startTime }, { endTime: null }, { endTime: undefined },
    { startTime: "2026-11-01T09:00:00" }, { startTime: "2026-02-30T09:00:00Z" },
    { startTime: "0000-01-01T00:00:00Z" }, { startTime: "2026-11-01T24:00:00Z" },
    { projectId: "../p1" }, { id: "bad/id" }, { isActive: "false" }, { description: "a".repeat(10001) },
  ]) assert.equal((await createEvent(request, body)).statusCode, 400, JSON.stringify(body).slice(0, 100));
});

test("validates query types, unsupported methods and paths", async () => {
  const { request } = fixture();
  for (const query of [
    { limit: "201" }, { limit: "0" }, { limit: "1.5" }, { includeDeleted: "yes" },
    { projectId: ["p1", "p2"] }, { cursor: "bad/id" }, { userId: "bob" },
    { from: endTime, to: startTime }, { isActive: "1" },
  ]) assert.equal((await request("GET", "/events", undefined, query)).statusCode, 400);
  const method = await request("DELETE", "/projects/p1");
  assert.equal(method.statusCode, 405);
  assert.equal(method.headers.Allow, "GET, PATCH");
  assert.equal((await request("GET", "/unknown")).statusCode, 404);
});
