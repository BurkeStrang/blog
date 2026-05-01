#include "protocol.h"
#include <stdexcept>
#include <charconv>

// ─── parser ───────────────────────────────────────────────────────────────────

static std::optional<size_t> find_crlf(const std::string& buf, size_t pos = 0) {
    auto idx = buf.find("\r\n", pos);
    if (idx == std::string::npos) return {};
    return idx;
}

static std::optional<long long> parse_integer_line(const std::string& buf, size_t start, size_t& end) {
    auto crlf = find_crlf(buf, start);
    if (!crlf) return {};
    long long val;
    auto res = std::from_chars(buf.data() + start, buf.data() + *crlf, val);
    if (res.ec != std::errc{}) throw std::runtime_error("Protocol error: invalid integer");
    end = *crlf + 2;
    return val;
}

std::optional<RespArray> parse_resp(std::string& buf) {
    if (buf.empty()) return {};

    if (buf[0] != '*') {
        // Inline command (simple space-separated line, used by telnet/nc)
        auto crlf = find_crlf(buf);
        if (!crlf) return {};
        std::string line = buf.substr(0, *crlf);
        buf.erase(0, *crlf + 2);
        RespArray arr;
        size_t i = 0;
        while (i < line.size()) {
            while (i < line.size() && line[i] == ' ') ++i;
            if (i >= line.size()) break;
            size_t j = i;
            while (j < line.size() && line[j] != ' ') ++j;
            arr.args.push_back(line.substr(i, j - i));
            i = j;
        }
        return arr.args.empty() ? std::nullopt : std::optional<RespArray>{arr};
    }

    size_t pos = 1;
    size_t end;
    auto count_opt = parse_integer_line(buf, pos, end);
    if (!count_opt) return {};
    long long count = *count_opt;
    pos = end;

    RespArray arr;
    for (long long i = 0; i < count; ++i) {
        if (pos >= buf.size()) return {};
        if (buf[pos] != '$') throw std::runtime_error("Protocol error: expected bulk string");
        ++pos;
        size_t len_end;
        auto len_opt = parse_integer_line(buf, pos, len_end);
        if (!len_opt) return {};
        long long len = *len_opt;
        pos = len_end;
        if ((long long)buf.size() - (long long)pos < len + 2) return {};
        arr.args.push_back(buf.substr(pos, len));
        pos += len + 2;
    }

    buf.erase(0, pos);
    return arr;
}

// ─── serializers ──────────────────────────────────────────────────────────────

std::string resp_ok() { return "+OK\r\n"; }
std::string resp_pong() { return "+PONG\r\n"; }
std::string resp_error(const std::string& msg) { return "-" + msg + "\r\n"; }
std::string resp_null_bulk() { return "$-1\r\n"; }
std::string resp_null_array() { return "*-1\r\n"; }

std::string resp_bulk(const std::string& s) {
    return "$" + std::to_string(s.size()) + "\r\n" + s + "\r\n";
}

std::string resp_integer(long long n) {
    return ":" + std::to_string(n) + "\r\n";
}

std::string resp_array(const std::vector<std::string>& items) {
    std::string out = "*" + std::to_string(items.size()) + "\r\n";
    for (auto& s : items) out += resp_bulk(s);
    return out;
}

std::string resp_mixed_array(const std::vector<std::optional<std::string>>& items) {
    std::string out = "*" + std::to_string(items.size()) + "\r\n";
    for (auto& s : items) out += s ? resp_bulk(*s) : resp_null_bulk();
    return out;
}

std::string resp_type_string(const std::string& type_name) {
    return "+" + type_name + "\r\n";
}
