#pragma once
#include "types.h"
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

class Store {
public:
    // String
    void        set(const std::string& key, const std::string& val, std::optional<int> ttl = {});
    std::optional<std::string> get(const std::string& key);

    // Generic
    int  del(const std::vector<std::string>& keys);
    bool exists(const std::string& key);
    std::optional<DataType> type(const std::string& key);
    bool expire(const std::string& key, int seconds);
    int  ttl(const std::string& key);
    std::vector<std::string> keys(const std::string& pattern);
    void flushdb();

    // Hash
    int hset(const std::string& key, const std::vector<std::pair<std::string, std::string>>& fields);
    std::optional<std::string> hget(const std::string& key, const std::string& field);
    std::vector<std::optional<std::string>> hmget(const std::string& key, const std::vector<std::string>& fields);
    std::vector<std::string> hgetall(const std::string& key);
    int  hdel(const std::string& key, const std::vector<std::string>& fields);
    bool hexists(const std::string& key, const std::string& field);
    std::vector<std::string> hkeys(const std::string& key);
    std::vector<std::string> hvals(const std::string& key);
    int  hlen(const std::string& key);

    // List
    int lpush(const std::string& key, const std::vector<std::string>& vals);
    int rpush(const std::string& key, const std::vector<std::string>& vals);
    std::optional<std::string> lpop(const std::string& key);
    std::optional<std::string> rpop(const std::string& key);
    std::vector<std::string> lrange(const std::string& key, int start, int stop);
    int llen(const std::string& key);

    // Set
    int  sadd(const std::string& key, const std::vector<std::string>& members);
    int  srem(const std::string& key, const std::vector<std::string>& members);
    std::vector<std::string> smembers(const std::string& key);
    int  scard(const std::string& key);
    bool sismember(const std::string& key, const std::string& member);

private:
    std::unordered_map<std::string, Entry> data_;
    mutable std::mutex mu_;

    Entry* get_entry(const std::string& key);
    HashVal*   require_hash(const std::string& key);
    ListVal*   require_list(const std::string& key);
    SetVal*    require_set(const std::string& key);

    static bool glob_match(const std::string& pattern, const std::string& str);
};
