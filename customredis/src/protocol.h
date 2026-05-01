#pragma once
#include <optional>
#include <string>
#include <vector>

// RESP (Redis Serialization Protocol) parser and serializer.

struct RespArray {
    std::vector<std::string> args;
};

// Returns parsed command args on success, nullopt if more data is needed.
// Throws std::runtime_error on protocol error.
// `buf` is consumed up to the parsed message on success.
std::optional<RespArray> parse_resp(std::string& buf);

// Serialization helpers
std::string resp_ok();
std::string resp_pong();
std::string resp_error(const std::string& msg);
std::string resp_null_bulk();
std::string resp_bulk(const std::string& s);
std::string resp_integer(long long n);
std::string resp_array(const std::vector<std::string>& items);
std::string resp_null_array();
// Array where some elements may be null (used by HMGET)
std::string resp_mixed_array(const std::vector<std::optional<std::string>>& items);
std::string resp_type_string(const std::string& type_name);
