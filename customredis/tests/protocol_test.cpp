#include "protocol.h"
#include <gtest/gtest.h>

// ── parser ────────────────────────────────────────────────────────────────────

TEST(Protocol, ParseArray) {
    std::string buf = "*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n";
    auto res = parse_resp(buf);
    ASSERT_TRUE(res.has_value());
    ASSERT_EQ(res->args.size(), 3u);
    EXPECT_EQ(res->args[0], "SET");
    EXPECT_EQ(res->args[1], "foo");
    EXPECT_EQ(res->args[2], "bar");
    EXPECT_TRUE(buf.empty()); // consumed
}

TEST(Protocol, ParseInline) {
    std::string buf = "PING\r\n";
    auto res = parse_resp(buf);
    ASSERT_TRUE(res.has_value());
    ASSERT_EQ(res->args.size(), 1u);
    EXPECT_EQ(res->args[0], "PING");
}

TEST(Protocol, ParseInlineMultiWord) {
    std::string buf = "SET foo bar\r\n";
    auto res = parse_resp(buf);
    ASSERT_TRUE(res.has_value());
    ASSERT_EQ(res->args.size(), 3u);
    EXPECT_EQ(res->args[0], "SET");
    EXPECT_EQ(res->args[1], "foo");
    EXPECT_EQ(res->args[2], "bar");
}

TEST(Protocol, ParseIncomplete) {
    std::string buf = "*3\r\n$3\r\nSET\r\n"; // missing 2 bulk strings
    auto res = parse_resp(buf);
    EXPECT_FALSE(res.has_value());
    // buf should be unchanged since we returned nullopt
}

TEST(Protocol, ParseMultipleCommands) {
    std::string buf = "PING\r\nPING\r\n";
    auto r1 = parse_resp(buf);
    ASSERT_TRUE(r1.has_value());
    EXPECT_EQ(r1->args[0], "PING");
    auto r2 = parse_resp(buf);
    ASSERT_TRUE(r2.has_value());
    EXPECT_EQ(r2->args[0], "PING");
    EXPECT_TRUE(buf.empty());
}

TEST(Protocol, ParseBinaryBulkString) {
    // bulk string containing spaces and special chars
    std::string buf = "*2\r\n$3\r\nGET\r\n$11\r\nhello world\r\n";
    auto res = parse_resp(buf);
    ASSERT_TRUE(res.has_value());
    EXPECT_EQ(res->args[1], "hello world");
}

TEST(Protocol, ParseEmptyBulkString) {
    std::string buf = "*1\r\n$0\r\n\r\n";
    auto res = parse_resp(buf);
    ASSERT_TRUE(res.has_value());
    EXPECT_EQ(res->args[0], "");
}

// ── serializers ───────────────────────────────────────────────────────────────

TEST(Protocol, RespOk) {
    EXPECT_EQ(resp_ok(), "+OK\r\n");
}

TEST(Protocol, RespPong) {
    EXPECT_EQ(resp_pong(), "+PONG\r\n");
}

TEST(Protocol, RespError) {
    EXPECT_EQ(resp_error("ERR bad"), "-ERR bad\r\n");
}

TEST(Protocol, RespNullBulk) {
    EXPECT_EQ(resp_null_bulk(), "$-1\r\n");
}

TEST(Protocol, RespBulk) {
    EXPECT_EQ(resp_bulk("hello"), "$5\r\nhello\r\n");
}

TEST(Protocol, RespBulkEmpty) {
    EXPECT_EQ(resp_bulk(""), "$0\r\n\r\n");
}

TEST(Protocol, RespInteger) {
    EXPECT_EQ(resp_integer(42),  ":42\r\n");
    EXPECT_EQ(resp_integer(0),   ":0\r\n");
    EXPECT_EQ(resp_integer(-1),  ":-1\r\n");
}

TEST(Protocol, RespArray) {
    auto r = resp_array({"foo", "bar"});
    EXPECT_EQ(r, "*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
}

TEST(Protocol, RespEmptyArray) {
    EXPECT_EQ(resp_array({}), "*0\r\n");
}

TEST(Protocol, RespNullArray) {
    EXPECT_EQ(resp_null_array(), "*-1\r\n");
}

TEST(Protocol, RespMixedArray) {
    std::vector<std::optional<std::string>> items = {"hello", std::nullopt, "world"};
    auto r = resp_mixed_array(items);
    EXPECT_EQ(r, "*3\r\n$5\r\nhello\r\n$-1\r\n$5\r\nworld\r\n");
}

TEST(Protocol, RespTypeString) {
    EXPECT_EQ(resp_type_string("hash"), "+hash\r\n");
    EXPECT_EQ(resp_type_string("none"), "+none\r\n");
}
