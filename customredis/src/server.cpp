#include "server.h"
#include "command.h"
#include "log.h"
#include "protocol.h"
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/tcp.h>
#include <stdexcept>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <unistd.h>
#include <cstring>
#include <iostream>
#include <string>
#include <unordered_map>

static constexpr int MAX_EVENTS = 64;
static constexpr size_t READ_BUF = 4096;

static void set_nonblocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0 || fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0)
        throw std::runtime_error("fcntl nonblocking failed");
}

static void epoll_add(int epfd, int fd, uint32_t events) {
    epoll_event ev{};
    ev.events  = events;
    ev.data.fd = fd;
    if (epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &ev) < 0)
        throw std::runtime_error("epoll_ctl ADD failed");
}

static void epoll_mod(int epfd, int fd, uint32_t events) {
    epoll_event ev{};
    ev.events  = events;
    ev.data.fd = fd;
    epoll_ctl(epfd, EPOLL_CTL_MOD, fd, &ev);
}

static void epoll_del(int epfd, int fd) {
    epoll_ctl(epfd, EPOLL_CTL_DEL, fd, nullptr);
}

static std::string addr_str(const sockaddr_in& addr) {
    char ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &addr.sin_addr, ip, sizeof(ip));
    return std::string(ip) + ":" + std::to_string(ntohs(addr.sin_port));
}

struct Client {
    std::string in_buf;            // bytes received from peer awaiting RESP parse
    std::string out_buf;           // bytes queued to send back; flushed opportunistically
    std::string addr;              // "ip:port" for logging
    int  cmd_count = 0;            // commands processed (0 means silent TCP probe)
    bool wants_write = false;      // true iff EPOLLOUT is currently registered on this fd
    bool close_after_drain = false;// QUIT or protocol-error path: close once out_buf empties
};

// Drain as many bytes as the kernel will accept from client.out_buf. On
// EAGAIN, register EPOLLOUT so we resume draining when the socket becomes
// writable. Returns false if the socket failed irrecoverably.
//
// This is the fix for the bug where a single send() call could only push the
// first ~64KB of a >64KB bulk response (Linux default SO_SNDBUF). The old
// code ignored the partial-write return value and the remainder was silently
// dropped, making large cached values (>30KB) appear corrupt to clients.
static bool flush_out(int epfd, int fd, Client& client) {
    while (!client.out_buf.empty()) {
        ssize_t n = send(fd, client.out_buf.data(), client.out_buf.size(), MSG_NOSIGNAL);
        if (n > 0) {
            client.out_buf.erase(0, static_cast<size_t>(n));
            continue;
        }
        if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
            if (!client.wants_write) {
                epoll_mod(epfd, fd, EPOLLIN | EPOLLOUT | EPOLLET);
                client.wants_write = true;
            }
            return true; // keep socket open, drain on next EPOLLOUT
        }
        // Any other error (EPIPE/ECONNRESET/etc): peer is gone, drop the
        // pending data; caller will close the fd.
        return false;
    }

    // Fully flushed.
    if (client.wants_write) {
        epoll_mod(epfd, fd, EPOLLIN | EPOLLET);
        client.wants_write = false;
    }
    return true;
}

// Append response bytes to the outbound buffer and try to flush them now.
static bool queue_send(int epfd, int fd, Client& client, const std::string& data) {
    client.out_buf.append(data);
    return flush_out(epfd, fd, client);
}

Server::Server(Store& store, int port) : store_(store), port_(port) {
    listen_fd_ = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd_ < 0) throw std::runtime_error("socket() failed");

    int opt = 1;
    setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    setsockopt(listen_fd_, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family      = AF_INET;
    addr.sin_port        = htons(port_);
    addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(listen_fd_, (sockaddr*)&addr, sizeof(addr)) < 0)
        throw std::runtime_error("bind() failed: " + std::string(strerror(errno)));
    if (listen(listen_fd_, SOMAXCONN) < 0)
        throw std::runtime_error("listen() failed");

    set_nonblocking(listen_fd_);

    epoll_fd_ = epoll_create1(0);
    if (epoll_fd_ < 0) throw std::runtime_error("epoll_create1() failed");

    epoll_add(epoll_fd_, listen_fd_, EPOLLIN);
}

Server::~Server() {
    if (epoll_fd_ >= 0) close(epoll_fd_);
    if (listen_fd_ >= 0) close(listen_fd_);
}

void Server::stop() { running_ = false; }

void Server::run() {
    running_ = true;
    std::unordered_map<int, Client> clients;
    epoll_event events[MAX_EVENTS];

    LOG("START", "customredis listening on port " + std::to_string(port_));

    auto close_client = [&](int fd) {
        auto it = clients.find(fd);
        if (it != clients.end() && it->second.cmd_count > 0)
            LOG("DISCONNECT", it->second.addr + " fd=" + std::to_string(fd));
        epoll_del(epoll_fd_, fd);
        clients.erase(fd);
        close(fd);
    };

    while (running_) {
        int nfds = epoll_wait(epoll_fd_, events, MAX_EVENTS, 500);
        if (nfds < 0) {
            if (errno == EINTR) continue;
            break;
        }

        for (int i = 0; i < nfds; ++i) {
            int fd = events[i].data.fd;

            if (fd == listen_fd_) {
                while (true) {
                    sockaddr_in cli{};
                    socklen_t len = sizeof(cli);
                    int cfd = accept4(listen_fd_, (sockaddr*)&cli, &len, SOCK_NONBLOCK);
                    if (cfd < 0) break;
                    Client c;
                    c.addr = addr_str(cli);
                    clients.emplace(cfd, std::move(c));
                    epoll_add(epoll_fd_, cfd, EPOLLIN | EPOLLET);
                }
                continue;
            }

            if (events[i].events & (EPOLLHUP | EPOLLERR)) {
                close_client(fd);
                continue;
            }

            auto cli_it = clients.find(fd);
            if (cli_it == clients.end()) continue;
            auto& client = cli_it->second;
            bool should_close = false;

            // The kernel send buffer has space — flush whatever we queued
            // previously. This is the half of the fix that resumes paused
            // large-payload sends.
            if (events[i].events & EPOLLOUT) {
                if (!flush_out(epoll_fd_, fd, client)) {
                    close_client(fd);
                    continue;
                }
                if (client.close_after_drain && client.out_buf.empty()) {
                    close_client(fd);
                    continue;
                }
            }

            if (events[i].events & EPOLLIN) {
                while (true) {
                    char tmp[READ_BUF];
                    ssize_t n = read(fd, tmp, sizeof(tmp));
                    if (n > 0) {
                        client.in_buf.append(tmp, n);
                    } else if (n == 0) {
                        should_close = true;
                        break;
                    } else {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                        should_close = true;
                        break;
                    }
                }

                while (true) {
                    try {
                        auto cmd = parse_resp(client.in_buf);
                        if (!cmd) break;
                        if (cmd->args.empty()) continue;
                        if (client.cmd_count == 0)
                            LOG("CONNECT", client.addr + " fd=" + std::to_string(fd));
                        client.cmd_count++;
                        std::string response = dispatch(store_, cmd->args);
                        const bool is_quit = (cmd->args[0] == "QUIT" || cmd->args[0] == "quit");
                        if (is_quit) client.close_after_drain = true;
                        if (!queue_send(epoll_fd_, fd, client, response)) {
                            should_close = true;
                            break;
                        }
                        if (is_quit && client.out_buf.empty()) {
                            should_close = true;
                            break;
                        }
                    } catch (...) {
                        LOG("ERROR", "protocol error from " + client.addr + " fd=" + std::to_string(fd));
                        client.close_after_drain = true;
                        std::string err = resp_error("ERR protocol error");
                        if (!queue_send(epoll_fd_, fd, client, err) || client.out_buf.empty())
                            should_close = true;
                        break;
                    }
                }

                if (should_close)
                    close_client(fd);
            }
        }
    }

    LOG("STOP", "shutting down");
}
