#include "command.h"
#include "store.h"
#include <gtest/gtest.h>

// Helper: run a command from a space-separated string
static std::string cmd(Store& s, std::initializer_list<std::string> args) {
    return dispatch(s, std::vector<std::string>(args));
}

// ── connection ────────────────────────────────────────────────────────────────

TEST(Command, Ping) {
    Store s;
    EXPECT_EQ(cmd(s, {"PING"}), "+PONG\r\n");
}

TEST(Command, PingWithMessage) {
    Store s;
    EXPECT_EQ(cmd(s, {"PING", "hello"}), "$5\r\nhello\r\n");
}

// ── string ────────────────────────────────────────────────────────────────────

TEST(Command, SetGet) {
    Store s;
    EXPECT_EQ(cmd(s, {"SET", "k", "v"}), "+OK\r\n");
    EXPECT_EQ(cmd(s, {"GET", "k"}), "$1\r\nv\r\n");
}

TEST(Command, GetMissing) {
    Store s;
    EXPECT_EQ(cmd(s, {"GET", "nope"}), "$-1\r\n");
}

TEST(Command, SetWithEX) {
    Store s;
    EXPECT_EQ(cmd(s, {"SET", "k", "v", "EX", "60"}), "+OK\r\n");
    auto ttl = cmd(s, {"TTL", "k"});
    // should be ":N\r\n" where N > 0
    EXPECT_NE(ttl, ":-1\r\n");
    EXPECT_NE(ttl, ":-2\r\n");
}

TEST(Command, SetWithPX) {
    Store s;
    EXPECT_EQ(cmd(s, {"SET", "k", "v", "PX", "60000"}), "+OK\r\n");
    auto ttl = cmd(s, {"TTL", "k"});
    EXPECT_NE(ttl, ":-1\r\n");
}

TEST(Command, MSet) {
    Store s;
    EXPECT_EQ(cmd(s, {"MSET", "a", "1", "b", "2"}), "+OK\r\n");
    EXPECT_EQ(cmd(s, {"GET", "a"}), "$1\r\n1\r\n");
    EXPECT_EQ(cmd(s, {"GET", "b"}), "$1\r\n2\r\n");
}

TEST(Command, MGet) {
    Store s;
    cmd(s, {"SET", "a", "alpha"});
    auto r = cmd(s, {"MGET", "a", "missing"});
    EXPECT_EQ(r, "*2\r\n$5\r\nalpha\r\n$-1\r\n");
}

TEST(Command, Incr) {
    Store s;
    EXPECT_EQ(cmd(s, {"INCR", "n"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"INCR", "n"}), ":2\r\n");
}

TEST(Command, Decr) {
    Store s;
    cmd(s, {"SET", "n", "5"});
    EXPECT_EQ(cmd(s, {"DECR", "n"}), ":4\r\n");
}

TEST(Command, IncrBy) {
    Store s;
    EXPECT_EQ(cmd(s, {"INCRBY", "n", "10"}), ":10\r\n");
    EXPECT_EQ(cmd(s, {"INCRBY", "n", "5"}), ":15\r\n");
}

TEST(Command, DecrBy) {
    Store s;
    cmd(s, {"SET", "n", "20"});
    EXPECT_EQ(cmd(s, {"DECRBY", "n", "8"}), ":12\r\n");
}

TEST(Command, Append) {
    Store s;
    cmd(s, {"SET", "k", "Hello"});
    EXPECT_EQ(cmd(s, {"APPEND", "k", " World"}), ":11\r\n");
    EXPECT_EQ(cmd(s, {"GET", "k"}), "$11\r\nHello World\r\n");
}

TEST(Command, StrLen) {
    Store s;
    cmd(s, {"SET", "k", "hello"});
    EXPECT_EQ(cmd(s, {"STRLEN", "k"}), ":5\r\n");
    EXPECT_EQ(cmd(s, {"STRLEN", "nope"}), ":0\r\n");
}

// ── generic ───────────────────────────────────────────────────────────────────

TEST(Command, Del) {
    Store s;
    cmd(s, {"SET", "a", "1"});
    cmd(s, {"SET", "b", "2"});
    EXPECT_EQ(cmd(s, {"DEL", "a", "b", "missing"}), ":2\r\n");
    EXPECT_EQ(cmd(s, {"GET", "a"}), "$-1\r\n");
}

TEST(Command, Exists) {
    Store s;
    cmd(s, {"SET", "k", "v"});
    EXPECT_EQ(cmd(s, {"EXISTS", "k"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"EXISTS", "nope"}), ":0\r\n");
    EXPECT_EQ(cmd(s, {"EXISTS", "k", "k"}), ":2\r\n"); // counted per arg
}

TEST(Command, Type) {
    Store s;
    cmd(s, {"SET", "str", "v"});
    EXPECT_EQ(cmd(s, {"TYPE", "str"}),  "+string\r\n");
    cmd(s, {"HSET", "h", "f", "v"});
    EXPECT_EQ(cmd(s, {"TYPE", "h"}),    "+hash\r\n");
    cmd(s, {"LPUSH", "l", "v"});
    EXPECT_EQ(cmd(s, {"TYPE", "l"}),    "+list\r\n");
    cmd(s, {"SADD", "s", "v"});
    EXPECT_EQ(cmd(s, {"TYPE", "s"}),    "+set\r\n");
    EXPECT_EQ(cmd(s, {"TYPE", "nope"}), "+none\r\n");
}

TEST(Command, Expire) {
    Store s;
    cmd(s, {"SET", "k", "v"});
    EXPECT_EQ(cmd(s, {"EXPIRE", "k", "60"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"EXPIRE", "nope", "60"}), ":0\r\n");
}

TEST(Command, TTL) {
    Store s;
    cmd(s, {"SET", "k", "v"});
    EXPECT_EQ(cmd(s, {"TTL", "k"}), ":-1\r\n");
    cmd(s, {"EXPIRE", "k", "60"});
    auto ttl = cmd(s, {"TTL", "k"});
    EXPECT_NE(ttl, ":-1\r\n");
    EXPECT_EQ(cmd(s, {"TTL", "nope"}), ":-2\r\n");
}

TEST(Command, Keys) {
    Store s;
    cmd(s, {"SET", "user:1", "a"});
    cmd(s, {"SET", "user:2", "b"});
    cmd(s, {"SET", "post:1", "c"});
    auto r = cmd(s, {"KEYS", "user:*"});
    // should be array of 2
    EXPECT_NE(r.find("user:1"), std::string::npos);
    EXPECT_NE(r.find("user:2"), std::string::npos);
    EXPECT_EQ(r.find("post:1"), std::string::npos);
}

TEST(Command, FlushDB) {
    Store s;
    cmd(s, {"SET", "k", "v"});
    EXPECT_EQ(cmd(s, {"FLUSHDB"}), "+OK\r\n");
    EXPECT_EQ(cmd(s, {"EXISTS", "k"}), ":0\r\n");
}

// ── hash ──────────────────────────────────────────────────────────────────────

TEST(Command, HSetHGet) {
    Store s;
    EXPECT_EQ(cmd(s, {"HSET", "h", "name", "Burke", "role", "admin"}), ":2\r\n");
    EXPECT_EQ(cmd(s, {"HGET", "h", "name"}), "$5\r\nBurke\r\n");
    EXPECT_EQ(cmd(s, {"HGET", "h", "missing"}), "$-1\r\n");
}

TEST(Command, HMSet) {
    Store s;
    EXPECT_EQ(cmd(s, {"HMSET", "h", "a", "1", "b", "2"}), "+OK\r\n");
}

TEST(Command, HMGet) {
    Store s;
    cmd(s, {"HSET", "h", "a", "alpha", "b", "beta"});
    auto r = cmd(s, {"HMGET", "h", "a", "missing", "b"});
    EXPECT_EQ(r, "*3\r\n$5\r\nalpha\r\n$-1\r\n$4\r\nbeta\r\n");
}

TEST(Command, HGetAll) {
    Store s;
    cmd(s, {"HSET", "post:1", "title", "Hello", "author", "Burke"});
    auto r = cmd(s, {"HGETALL", "post:1"});
    EXPECT_NE(r.find("title"), std::string::npos);
    EXPECT_NE(r.find("Hello"), std::string::npos);
}

TEST(Command, HDel) {
    Store s;
    cmd(s, {"HSET", "h", "a", "1", "b", "2"});
    EXPECT_EQ(cmd(s, {"HDEL", "h", "a", "missing"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"HGET", "h", "a"}), "$-1\r\n");
}

TEST(Command, HExists) {
    Store s;
    cmd(s, {"HSET", "h", "f", "v"});
    EXPECT_EQ(cmd(s, {"HEXISTS", "h", "f"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"HEXISTS", "h", "nope"}), ":0\r\n");
}

TEST(Command, HLen) {
    Store s;
    cmd(s, {"HSET", "h", "a", "1", "b", "2", "c", "3"});
    EXPECT_EQ(cmd(s, {"HLEN", "h"}), ":3\r\n");
}

TEST(Command, HKeys) {
    Store s;
    cmd(s, {"HSET", "user:1", "name", "Burke", "email", "b@example.com"});
    auto r = cmd(s, {"HKEYS", "user:1"});
    EXPECT_NE(r.find("name"), std::string::npos);
    EXPECT_NE(r.find("email"), std::string::npos);
}

TEST(Command, HVals) {
    Store s;
    cmd(s, {"HSET", "h", "k", "myvalue"});
    auto r = cmd(s, {"HVALS", "h"});
    EXPECT_NE(r.find("myvalue"), std::string::npos);
}

// ── list ──────────────────────────────────────────────────────────────────────

TEST(Command, LPushLRange) {
    Store s;
    EXPECT_EQ(cmd(s, {"LPUSH", "comments", "cmt1"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"LPUSH", "comments", "cmt2", "cmt3"}), ":3\r\n");
    auto r = cmd(s, {"LRANGE", "comments", "0", "-1"});
    EXPECT_NE(r.find("cmt3"), std::string::npos); // cmt3 at head
}

TEST(Command, RPushLRange) {
    Store s;
    cmd(s, {"RPUSH", "l", "a", "b", "c"});
    auto r = cmd(s, {"LRANGE", "l", "0", "-1"});
    EXPECT_EQ(r, "*3\r\n$1\r\na\r\n$1\r\nb\r\n$1\r\nc\r\n");
}

TEST(Command, LPop) {
    Store s;
    cmd(s, {"RPUSH", "l", "a", "b"});
    EXPECT_EQ(cmd(s, {"LPOP", "l"}), "$1\r\na\r\n");
    EXPECT_EQ(cmd(s, {"LPOP", "nope"}), "$-1\r\n");
}

TEST(Command, RPop) {
    Store s;
    cmd(s, {"RPUSH", "l", "a", "b"});
    EXPECT_EQ(cmd(s, {"RPOP", "l"}), "$1\r\nb\r\n");
}

TEST(Command, LLen) {
    Store s;
    cmd(s, {"RPUSH", "l", "a", "b", "c"});
    EXPECT_EQ(cmd(s, {"LLEN", "l"}), ":3\r\n");
    EXPECT_EQ(cmd(s, {"LLEN", "nope"}), ":0\r\n");
}

// ── set ───────────────────────────────────────────────────────────────────────

TEST(Command, SAdd) {
    Store s;
    EXPECT_EQ(cmd(s, {"SADD", "tags", "go", "cpp", "redis"}), ":3\r\n");
    EXPECT_EQ(cmd(s, {"SADD", "tags", "go"}), ":0\r\n"); // duplicate
}

TEST(Command, SRem) {
    Store s;
    cmd(s, {"SADD", "s", "a", "b", "c"});
    EXPECT_EQ(cmd(s, {"SREM", "s", "a", "missing"}), ":1\r\n");
}

TEST(Command, SMembers) {
    Store s;
    cmd(s, {"SADD", "s", "alpha", "beta"});
    auto r = cmd(s, {"SMEMBERS", "s"});
    EXPECT_NE(r.find("alpha"), std::string::npos);
    EXPECT_NE(r.find("beta"), std::string::npos);
}

TEST(Command, SCard) {
    Store s;
    cmd(s, {"SADD", "s", "a", "b", "c"});
    EXPECT_EQ(cmd(s, {"SCARD", "s"}), ":3\r\n");
    EXPECT_EQ(cmd(s, {"SCARD", "nope"}), ":0\r\n");
}

TEST(Command, SIsMember) {
    Store s;
    cmd(s, {"SADD", "s", "member"});
    EXPECT_EQ(cmd(s, {"SISMEMBER", "s", "member"}), ":1\r\n");
    EXPECT_EQ(cmd(s, {"SISMEMBER", "s", "other"}), ":0\r\n");
}

// ── error handling ────────────────────────────────────────────────────────────

TEST(Command, UnknownCommand) {
    Store s;
    auto r = cmd(s, {"UNKNOWNCMD"});
    EXPECT_EQ(r.substr(0, 1), "-"); // error response
}

TEST(Command, WrongArgCount) {
    Store s;
    auto r = cmd(s, {"GET"});
    EXPECT_EQ(r.substr(0, 1), "-");
}

TEST(Command, WrongType) {
    Store s;
    cmd(s, {"HSET", "h", "f", "v"});
    auto r = cmd(s, {"GET", "h"}); // GET on a hash
    EXPECT_EQ(r.substr(0, 1), "-");
    EXPECT_NE(r.find("WRONGTYPE"), std::string::npos);
}

// ── blog-specific usage patterns ──────────────────────────────────────────────

TEST(Command, BlogUserDocument) {
    Store s;
    // Store user as hash: user:{id}
    cmd(s, {"HSET", "user:42", "name", "Burke Strang", "email", "burke@example.com", "role", "admin"});
    EXPECT_EQ(cmd(s, {"HGET", "user:42", "name"}),  "$12\r\nBurke Strang\r\n");
    EXPECT_EQ(cmd(s, {"HGET", "user:42", "role"}),  "$5\r\nadmin\r\n");
    EXPECT_EQ(cmd(s, {"HLEN", "user:42"}), ":3\r\n");
}

TEST(Command, BlogPostDocument) {
    Store s;
    // Store post as hash
    cmd(s, {"HSET", "post:1", "title", "Hello World", "author_id", "42", "status", "published"});
    // Tag index
    cmd(s, {"SADD", "post:1:tags", "go", "backend", "tutorial"});
    // Comment list
    cmd(s, {"RPUSH", "post:1:comments", "cmt:1", "cmt:2", "cmt:3"});

    EXPECT_EQ(cmd(s, {"HGET", "post:1", "title"}),   "$11\r\nHello World\r\n");
    EXPECT_EQ(cmd(s, {"SCARD", "post:1:tags"}),       ":3\r\n");
    EXPECT_EQ(cmd(s, {"LLEN", "post:1:comments"}),    ":3\r\n");
}

TEST(Command, BlogPostIndex) {
    Store s;
    // Sorted post IDs stored in a list
    cmd(s, {"RPUSH", "posts:index", "post:3", "post:2", "post:1"});
    auto page = cmd(s, {"LRANGE", "posts:index", "0", "1"}); // first 2 posts
    EXPECT_NE(page.find("post:3"), std::string::npos);
    EXPECT_NE(page.find("post:2"), std::string::npos);
    EXPECT_EQ(page.find("post:1"), std::string::npos);
}

TEST(Command, BlogSessionToken) {
    Store s;
    // Session with TTL
    cmd(s, {"SET", "session:abc123", "user:42", "EX", "3600"});
    EXPECT_EQ(cmd(s, {"GET", "session:abc123"}), "$7\r\nuser:42\r\n");
    auto ttl = cmd(s, {"TTL", "session:abc123"});
    EXPECT_NE(ttl, ":-1\r\n");
    EXPECT_NE(ttl, ":-2\r\n");
}
