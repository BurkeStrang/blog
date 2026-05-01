#include "command.h"
#include "log.h"
#include "protocol.h"
#include <algorithm>
#include <cctype>
#include <stdexcept>

static std::string to_upper(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), ::toupper);
    return s;
}

static int parse_int(const std::string& s) {
    try { return std::stoi(s); }
    catch (...) { throw std::runtime_error("ERR value is not an integer or out of range"); }
}

std::string dispatch(Store& store, const std::vector<std::string>& args) {
    if (args.empty()) return resp_error("ERR empty command");

    const std::string cmd = to_upper(args[0]);

    try {
        // ── connection ──────────────────────────────────────────────────────
        if (cmd == "PING") {
            if (args.size() == 1) return resp_pong();
            return resp_bulk(args[1]);
        }
        if (cmd == "QUIT" || cmd == "RESET") return resp_ok();
        if (cmd == "COMMAND") return resp_ok();

        // ── string ──────────────────────────────────────────────────────────
        if (cmd == "SET") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'set' command");
            std::optional<int> ttl;
            for (size_t i = 3; i < args.size(); ++i) {
                if (to_upper(args[i]) == "EX" && i + 1 < args.size()) {
                    ttl = parse_int(args[++i]);
                } else if (to_upper(args[i]) == "PX" && i + 1 < args.size()) {
                    ttl = std::max(1, parse_int(args[++i]) / 1000);
                }
            }
            store.set(args[1], args[2], ttl);
            {
                std::string msg = "SET " + args[1] + " (" + std::to_string(args[2].size()) + " bytes";
                if (ttl) msg += ", TTL " + std::to_string(*ttl) + "s";
                LOG("CMD", msg + ")");
            }
            return resp_ok();
        }
        if (cmd == "GET") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'get' command");
            auto v = store.get(args[1]);
            LOG("CMD", std::string("GET ") + args[1] + (v ? " -> HIT" : " -> MISS"));
            return v ? resp_bulk(*v) : resp_null_bulk();
        }
        if (cmd == "MSET") {
            if (args.size() < 3 || (args.size() - 1) % 2 != 0)
                return resp_error("ERR wrong number of arguments for 'mset' command");
            for (size_t i = 1; i < args.size(); i += 2)
                store.set(args[i], args[i + 1]);
            return resp_ok();
        }
        if (cmd == "MGET") {
            if (args.size() < 2)
                return resp_error("ERR wrong number of arguments for 'mget' command");
            std::vector<std::optional<std::string>> result;
            for (size_t i = 1; i < args.size(); ++i)
                result.push_back(store.get(args[i]));
            return resp_mixed_array(result);
        }
        if (cmd == "INCR" || cmd == "DECR") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for '" + args[0] + "' command");
            auto v = store.get(args[1]);
            long long n = v ? std::stoll(*v) : 0;
            n += (cmd == "INCR" ? 1 : -1);
            store.set(args[1], std::to_string(n));
            return resp_integer(n);
        }
        if (cmd == "INCRBY" || cmd == "DECRBY") {
            if (args.size() != 3)
                return resp_error("ERR wrong number of arguments for '" + args[0] + "' command");
            auto v = store.get(args[1]);
            long long n = v ? std::stoll(*v) : 0;
            long long by = std::stoll(args[2]);
            n += (cmd == "INCRBY" ? by : -by);
            store.set(args[1], std::to_string(n));
            return resp_integer(n);
        }
        if (cmd == "APPEND") {
            if (args.size() != 3)
                return resp_error("ERR wrong number of arguments for 'append' command");
            auto v = store.get(args[1]);
            std::string newval = (v ? *v : "") + args[2];
            store.set(args[1], newval);
            return resp_integer((long long)newval.size());
        }
        if (cmd == "STRLEN") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'strlen' command");
            auto v = store.get(args[1]);
            return resp_integer(v ? (long long)v->size() : 0);
        }

        // ── generic ─────────────────────────────────────────────────────────
        if (cmd == "DEL") {
            if (args.size() < 2)
                return resp_error("ERR wrong number of arguments for 'del' command");
            std::vector<std::string> keys(args.begin() + 1, args.end());
            int deleted = store.del(keys);
            LOG("CMD", "DEL " + std::to_string(keys.size()) + " key(s), removed " + std::to_string(deleted));
            return resp_integer(deleted);
        }
        if (cmd == "EXISTS") {
            if (args.size() < 2)
                return resp_error("ERR wrong number of arguments for 'exists' command");
            int count = 0;
            for (size_t i = 1; i < args.size(); ++i)
                count += store.exists(args[i]) ? 1 : 0;
            return resp_integer(count);
        }
        if (cmd == "TYPE") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'type' command");
            auto t = store.type(args[1]);
            if (!t) return resp_type_string("none");
            switch (*t) {
                case DataType::String: return resp_type_string("string");
                case DataType::Hash:   return resp_type_string("hash");
                case DataType::List:   return resp_type_string("list");
                case DataType::Set:    return resp_type_string("set");
            }
        }
        if (cmd == "EXPIRE") {
            if (args.size() != 3)
                return resp_error("ERR wrong number of arguments for 'expire' command");
            return resp_integer(store.expire(args[1], parse_int(args[2])) ? 1 : 0);
        }
        if (cmd == "TTL") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'ttl' command");
            return resp_integer(store.ttl(args[1]));
        }
        if (cmd == "PERSIST") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'persist' command");
            return resp_integer(store.expire(args[1], -1) ? 1 : 0);
        }
        if (cmd == "KEYS") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'keys' command");
            auto result = store.keys(args[1]);
            LOG("CMD", "KEYS " + args[1] + " -> " + std::to_string(result.size()) + " match(es)");
            return resp_array(result);
        }
        if (cmd == "FLUSHDB" || cmd == "FLUSHALL") {
            store.flushdb();
            LOG("CMD", cmd + " -> store cleared");
            return resp_ok();
        }
        if (cmd == "SELECT") return resp_ok(); // single-db stub
        if (cmd == "DBSIZE") return resp_integer((long long)store.keys("*").size());
        if (cmd == "CLIENT") {
            if (args.size() >= 2) {
                std::string sub = to_upper(args[1]);
                if (sub == "SETNAME") return resp_ok();
                if (sub == "GETNAME") return resp_bulk("");
                if (sub == "ID")      return resp_integer(1);
                if (sub == "INFO")    return resp_bulk("id=1 addr=127.0.0.1:0 name=\n");
            }
            return resp_ok();
        }

        // ── hash ────────────────────────────────────────────────────────────
        if (cmd == "HSET" || cmd == "HMSET") {
            if (args.size() < 4 || (args.size() - 2) % 2 != 0)
                return resp_error("ERR wrong number of arguments for '" + args[0] + "' command");
            std::vector<std::pair<std::string, std::string>> fields;
            for (size_t i = 2; i < args.size(); i += 2)
                fields.emplace_back(args[i], args[i + 1]);
            int added = store.hset(args[1], fields);
            return cmd == "HMSET" ? resp_ok() : resp_integer(added);
        }
        if (cmd == "HGET") {
            if (args.size() != 3)
                return resp_error("ERR wrong number of arguments for 'hget' command");
            auto v = store.hget(args[1], args[2]);
            return v ? resp_bulk(*v) : resp_null_bulk();
        }
        if (cmd == "HMGET") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'hmget' command");
            std::vector<std::string> fields(args.begin() + 2, args.end());
            return resp_mixed_array(store.hmget(args[1], fields));
        }
        if (cmd == "HGETALL") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'hgetall' command");
            return resp_array(store.hgetall(args[1]));
        }
        if (cmd == "HDEL") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'hdel' command");
            std::vector<std::string> fields(args.begin() + 2, args.end());
            return resp_integer(store.hdel(args[1], fields));
        }
        if (cmd == "HEXISTS") {
            if (args.size() != 3)
                return resp_error("ERR wrong number of arguments for 'hexists' command");
            return resp_integer(store.hexists(args[1], args[2]) ? 1 : 0);
        }
        if (cmd == "HKEYS") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'hkeys' command");
            return resp_array(store.hkeys(args[1]));
        }
        if (cmd == "HVALS") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'hvals' command");
            return resp_array(store.hvals(args[1]));
        }
        if (cmd == "HLEN") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'hlen' command");
            return resp_integer(store.hlen(args[1]));
        }

        // ── list ────────────────────────────────────────────────────────────
        if (cmd == "LPUSH") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'lpush' command");
            std::vector<std::string> vals(args.begin() + 2, args.end());
            return resp_integer(store.lpush(args[1], vals));
        }
        if (cmd == "RPUSH") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'rpush' command");
            std::vector<std::string> vals(args.begin() + 2, args.end());
            return resp_integer(store.rpush(args[1], vals));
        }
        if (cmd == "LPOP") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'lpop' command");
            auto v = store.lpop(args[1]);
            return v ? resp_bulk(*v) : resp_null_bulk();
        }
        if (cmd == "RPOP") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'rpop' command");
            auto v = store.rpop(args[1]);
            return v ? resp_bulk(*v) : resp_null_bulk();
        }
        if (cmd == "LRANGE") {
            if (args.size() != 4)
                return resp_error("ERR wrong number of arguments for 'lrange' command");
            return resp_array(store.lrange(args[1], parse_int(args[2]), parse_int(args[3])));
        }
        if (cmd == "LLEN") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'llen' command");
            return resp_integer(store.llen(args[1]));
        }

        // ── set ─────────────────────────────────────────────────────────────
        if (cmd == "SADD") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'sadd' command");
            std::vector<std::string> members(args.begin() + 2, args.end());
            return resp_integer(store.sadd(args[1], members));
        }
        if (cmd == "SREM") {
            if (args.size() < 3)
                return resp_error("ERR wrong number of arguments for 'srem' command");
            std::vector<std::string> members(args.begin() + 2, args.end());
            return resp_integer(store.srem(args[1], members));
        }
        if (cmd == "SMEMBERS") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'smembers' command");
            return resp_array(store.smembers(args[1]));
        }
        if (cmd == "SCARD") {
            if (args.size() != 2)
                return resp_error("ERR wrong number of arguments for 'scard' command");
            return resp_integer(store.scard(args[1]));
        }
        if (cmd == "SISMEMBER") {
            if (args.size() != 3)
                return resp_error("ERR wrong number of arguments for 'sismember' command");
            return resp_integer(store.sismember(args[1], args[2]) ? 1 : 0);
        }

        return resp_error("ERR unknown command '" + args[0] + "'");

    } catch (const std::runtime_error& e) {
        return resp_error(e.what());
    } catch (...) {
        return resp_error("ERR internal error");
    }
}
