#include "store.h"
#include <gtest/gtest.h>
#include <thread>
#include <chrono>

using namespace std::chrono_literals;

// ── string ────────────────────────────────────────────────────────────────────

TEST(StoreString, SetAndGet) {
    Store s;
    s.set("k", "hello");
    EXPECT_EQ(s.get("k"), "hello");
}

TEST(StoreString, GetMissing) {
    Store s;
    EXPECT_EQ(s.get("nope"), std::nullopt);
}

TEST(StoreString, OverwriteKey) {
    Store s;
    s.set("k", "first");
    s.set("k", "second");
    EXPECT_EQ(s.get("k"), "second");
}

TEST(StoreString, SetWithTTL) {
    Store s;
    s.set("k", "val", 100);
    EXPECT_EQ(s.get("k"), "val");
    EXPECT_GT(s.ttl("k"), 0);
}

TEST(StoreString, ExpiredKeyReturnsNullopt) {
    Store s;
    s.set("k", "val", 1);
    std::this_thread::sleep_for(1100ms);
    EXPECT_EQ(s.get("k"), std::nullopt);
}

TEST(StoreString, WrongTypeThrows) {
    Store s;
    s.hset("h", {{"f", "v"}});
    EXPECT_THROW(s.get("h"), std::runtime_error);
}

// ── generic ───────────────────────────────────────────────────────────────────

TEST(StoreGeneric, Del) {
    Store s;
    s.set("a", "1");
    s.set("b", "2");
    EXPECT_EQ(s.del({"a", "b", "missing"}), 2);
    EXPECT_EQ(s.get("a"), std::nullopt);
}

TEST(StoreGeneric, Exists) {
    Store s;
    s.set("k", "v");
    EXPECT_TRUE(s.exists("k"));
    EXPECT_FALSE(s.exists("nope"));
}

TEST(StoreGeneric, TypeString) {
    Store s;
    s.set("k", "v");
    EXPECT_EQ(s.type("k"), DataType::String);
}

TEST(StoreGeneric, TypeHash) {
    Store s;
    s.hset("h", {{"f", "v"}});
    EXPECT_EQ(s.type("h"), DataType::Hash);
}

TEST(StoreGeneric, TypeList) {
    Store s;
    s.lpush("l", {"a"});
    EXPECT_EQ(s.type("l"), DataType::List);
}

TEST(StoreGeneric, TypeSet) {
    Store s;
    s.sadd("s", {"a"});
    EXPECT_EQ(s.type("s"), DataType::Set);
}

TEST(StoreGeneric, TypeMissing) {
    Store s;
    EXPECT_EQ(s.type("nope"), std::nullopt);
}

TEST(StoreGeneric, ExpireAndTTL) {
    Store s;
    s.set("k", "v");
    EXPECT_TRUE(s.expire("k", 60));
    EXPECT_GT(s.ttl("k"), 50);
    EXPECT_LE(s.ttl("k"), 60);
}

TEST(StoreGeneric, TTLNoExpiry) {
    Store s;
    s.set("k", "v");
    EXPECT_EQ(s.ttl("k"), -1);
}

TEST(StoreGeneric, TTLMissing) {
    Store s;
    EXPECT_EQ(s.ttl("nope"), -2);
}

TEST(StoreGeneric, TTLExpired) {
    Store s;
    s.set("k", "v", 1);
    std::this_thread::sleep_for(1100ms);
    EXPECT_EQ(s.ttl("k"), -2);
}

TEST(StoreGeneric, ExpireMissingKey) {
    Store s;
    EXPECT_FALSE(s.expire("nope", 60));
}

TEST(StoreGeneric, Keys) {
    Store s;
    s.set("user:1", "a");
    s.set("user:2", "b");
    s.set("post:1", "c");
    auto keys = s.keys("user:*");
    ASSERT_EQ(keys.size(), 2u);
}

TEST(StoreGeneric, KeysWildcard) {
    Store s;
    s.set("foo", "a");
    s.set("bar", "b");
    auto keys = s.keys("*");
    EXPECT_EQ(keys.size(), 2u);
}

TEST(StoreGeneric, KeysQuestion) {
    Store s;
    s.set("abc", "v");
    s.set("axc", "v");
    s.set("abcd", "v");
    auto keys = s.keys("a?c");
    EXPECT_EQ(keys.size(), 2u);
}

TEST(StoreGeneric, FlushDB) {
    Store s;
    s.set("a", "1");
    s.hset("h", {{"f", "v"}});
    s.flushdb();
    EXPECT_FALSE(s.exists("a"));
    EXPECT_FALSE(s.exists("h"));
}

// ── hash ──────────────────────────────────────────────────────────────────────

TEST(StoreHash, HSetAndHGet) {
    Store s;
    s.hset("h", {{"name", "Burke"}, {"role", "admin"}});
    EXPECT_EQ(s.hget("h", "name"), "Burke");
    EXPECT_EQ(s.hget("h", "role"), "admin");
}

TEST(StoreHash, HGetMissingField) {
    Store s;
    s.hset("h", {{"f", "v"}});
    EXPECT_EQ(s.hget("h", "nope"), std::nullopt);
}

TEST(StoreHash, HGetMissingKey) {
    Store s;
    EXPECT_EQ(s.hget("nope", "f"), std::nullopt);
}

TEST(StoreHash, HSetReturnsAddedCount) {
    Store s;
    EXPECT_EQ(s.hset("h", {{"a", "1"}, {"b", "2"}}), 2);
    EXPECT_EQ(s.hset("h", {{"a", "new"}, {"c", "3"}}), 1); // only c is new
}

TEST(StoreHash, HMGet) {
    Store s;
    s.hset("h", {{"a", "1"}, {"b", "2"}});
    auto res = s.hmget("h", {"a", "missing", "b"});
    ASSERT_EQ(res.size(), 3u);
    EXPECT_EQ(res[0], "1");
    EXPECT_EQ(res[1], std::nullopt);
    EXPECT_EQ(res[2], "2");
}

TEST(StoreHash, HGetAll) {
    Store s;
    s.hset("h", {{"title", "Hello"}, {"author", "Burke"}});
    auto all = s.hgetall("h");
    EXPECT_EQ(all.size(), 4u); // 2 field-value pairs
}

TEST(StoreHash, HGetAllEmpty) {
    Store s;
    EXPECT_TRUE(s.hgetall("nope").empty());
}

TEST(StoreHash, HDel) {
    Store s;
    s.hset("h", {{"a", "1"}, {"b", "2"}});
    EXPECT_EQ(s.hdel("h", {"a", "missing"}), 1);
    EXPECT_EQ(s.hget("h", "a"), std::nullopt);
    EXPECT_EQ(s.hget("h", "b"), "2");
}

TEST(StoreHash, HExists) {
    Store s;
    s.hset("h", {{"f", "v"}});
    EXPECT_TRUE(s.hexists("h", "f"));
    EXPECT_FALSE(s.hexists("h", "nope"));
    EXPECT_FALSE(s.hexists("nope", "f"));
}

TEST(StoreHash, HLen) {
    Store s;
    s.hset("h", {{"a", "1"}, {"b", "2"}, {"c", "3"}});
    EXPECT_EQ(s.hlen("h"), 3);
    EXPECT_EQ(s.hlen("nope"), 0);
}

TEST(StoreHash, HKeys) {
    Store s;
    s.hset("h", {{"name", "v"}, {"email", "v"}});
    auto keys = s.hkeys("h");
    EXPECT_EQ(keys.size(), 2u);
}

TEST(StoreHash, HVals) {
    Store s;
    s.hset("h", {{"f1", "val1"}, {"f2", "val2"}});
    auto vals = s.hvals("h");
    EXPECT_EQ(vals.size(), 2u);
}

TEST(StoreHash, WrongTypeThrows) {
    Store s;
    s.set("k", "str");
    EXPECT_THROW(s.hget("k", "f"), std::runtime_error);
}

// ── list ──────────────────────────────────────────────────────────────────────

TEST(StoreList, LPush) {
    Store s;
    EXPECT_EQ(s.lpush("l", {"a"}), 1);
    EXPECT_EQ(s.lpush("l", {"b", "c"}), 3); // b then c prepended
}

TEST(StoreList, RPush) {
    Store s;
    s.rpush("l", {"a", "b", "c"});
    auto r = s.lrange("l", 0, -1);
    ASSERT_EQ(r.size(), 3u);
    EXPECT_EQ(r[0], "a");
    EXPECT_EQ(r[2], "c");
}

TEST(StoreList, LPushOrder) {
    Store s;
    s.lpush("l", {"first", "second", "third"}); // third ends up at front
    auto r = s.lrange("l", 0, -1);
    EXPECT_EQ(r[0], "third");
    EXPECT_EQ(r[2], "first");
}

TEST(StoreList, LPop) {
    Store s;
    s.rpush("l", {"a", "b", "c"});
    EXPECT_EQ(s.lpop("l"), "a");
    EXPECT_EQ(s.lpop("l"), "b");
}

TEST(StoreList, RPop) {
    Store s;
    s.rpush("l", {"a", "b", "c"});
    EXPECT_EQ(s.rpop("l"), "c");
}

TEST(StoreList, PopEmpty) {
    Store s;
    EXPECT_EQ(s.lpop("nope"), std::nullopt);
    EXPECT_EQ(s.rpop("nope"), std::nullopt);
}

TEST(StoreList, LRange) {
    Store s;
    s.rpush("l", {"a", "b", "c", "d", "e"});
    EXPECT_EQ(s.lrange("l", 1, 3), (std::vector<std::string>{"b", "c", "d"}));
}

TEST(StoreList, LRangeNegative) {
    Store s;
    s.rpush("l", {"a", "b", "c"});
    auto r = s.lrange("l", -2, -1);
    ASSERT_EQ(r.size(), 2u);
    EXPECT_EQ(r[0], "b");
    EXPECT_EQ(r[1], "c");
}

TEST(StoreList, LRangeAll) {
    Store s;
    s.rpush("l", {"x", "y", "z"});
    EXPECT_EQ(s.lrange("l", 0, -1).size(), 3u);
}

TEST(StoreList, LLen) {
    Store s;
    s.rpush("l", {"a", "b", "c"});
    EXPECT_EQ(s.llen("l"), 3);
    EXPECT_EQ(s.llen("nope"), 0);
}

TEST(StoreList, PopUntilEmpty) {
    Store s;
    s.rpush("l", {"only"});
    s.lpop("l");
    EXPECT_FALSE(s.exists("l")); // key removed when list empties
}

TEST(StoreList, WrongTypeThrows) {
    Store s;
    s.set("k", "str");
    EXPECT_THROW(s.lpush("k", {"v"}), std::runtime_error);
}

// ── set ───────────────────────────────────────────────────────────────────────

TEST(StoreSet, SAdd) {
    Store s;
    EXPECT_EQ(s.sadd("s", {"a", "b", "c"}), 3);
    EXPECT_EQ(s.sadd("s", {"a", "d"}), 1); // a is duplicate
}

TEST(StoreSet, SRem) {
    Store s;
    s.sadd("s", {"a", "b", "c"});
    EXPECT_EQ(s.srem("s", {"a", "missing"}), 1);
    EXPECT_FALSE(s.sismember("s", "a"));
}

TEST(StoreSet, SMembers) {
    Store s;
    s.sadd("s", {"go", "redis", "cpp"});
    auto m = s.smembers("s");
    EXPECT_EQ(m.size(), 3u);
}

TEST(StoreSet, SCard) {
    Store s;
    s.sadd("s", {"a", "b"});
    EXPECT_EQ(s.scard("s"), 2);
    EXPECT_EQ(s.scard("nope"), 0);
}

TEST(StoreSet, SIsMember) {
    Store s;
    s.sadd("s", {"member"});
    EXPECT_TRUE(s.sismember("s", "member"));
    EXPECT_FALSE(s.sismember("s", "other"));
    EXPECT_FALSE(s.sismember("nope", "member"));
}

TEST(StoreSet, RemoveUntilEmpty) {
    Store s;
    s.sadd("s", {"only"});
    s.srem("s", {"only"});
    EXPECT_FALSE(s.exists("s"));
}

TEST(StoreSet, WrongTypeThrows) {
    Store s;
    s.set("k", "str");
    EXPECT_THROW(s.sadd("k", {"v"}), std::runtime_error);
}

// ── concurrency ───────────────────────────────────────────────────────────────

TEST(StoreConcurrency, ConcurrentSets) {
    Store s;
    std::vector<std::thread> threads;
    for (int i = 0; i < 8; ++i) {
        threads.emplace_back([&s, i] {
            for (int j = 0; j < 100; ++j)
                s.set("key:" + std::to_string(i), std::to_string(j));
        });
    }
    for (auto& t : threads) t.join();
    // all 8 keys should exist
    for (int i = 0; i < 8; ++i)
        EXPECT_TRUE(s.exists("key:" + std::to_string(i)));
}
