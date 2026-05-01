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

static void epoll_del(int epfd, int fd) {
    epoll_ctl(epfd, EPOLL_CTL_DEL, fd, nullptr);
}

static std::string addr_str(const sockaddr_in& addr) {
    char ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &addr.sin_addr, ip, sizeof(ip));
    return std::string(ip) + ":" + std::to_string(ntohs(addr.sin_port));
}

struct Client {
    std::string buf;
    std::string addr; // "ip:port" for logging
};

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
                    std::string peer = addr_str(cli);
                    clients[cfd] = {"", peer};
                    epoll_add(epoll_fd_, cfd, EPOLLIN | EPOLLET);
                    LOG("CONNECT", peer + " fd=" + std::to_string(cfd));
                }
                continue;
            }

            if (events[i].events & (EPOLLHUP | EPOLLERR)) {
                auto it = clients.find(fd);
                std::string peer = it != clients.end() ? it->second.addr : "?";
                LOG("DISCONNECT", peer + " fd=" + std::to_string(fd));
                epoll_del(epoll_fd_, fd);
                clients.erase(fd);
                close(fd);
                continue;
            }

            if (events[i].events & EPOLLIN) {
                auto& client = clients[fd];
                bool closed = false;

                while (true) {
                    char tmp[READ_BUF];
                    ssize_t n = read(fd, tmp, sizeof(tmp));
                    if (n > 0) {
                        client.buf.append(tmp, n);
                    } else if (n == 0) {
                        closed = true;
                        break;
                    } else {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                        closed = true;
                        break;
                    }
                }

                while (true) {
                    try {
                        auto cmd = parse_resp(client.buf);
                        if (!cmd) break;
                        if (!cmd->args.empty()) {
                            std::string response = dispatch(store_, cmd->args);
                            if (cmd->args[0] == "QUIT" || cmd->args[0] == "quit") {
                                send(fd, response.data(), response.size(), MSG_NOSIGNAL);
                                closed = true;
                                break;
                            }
                            send(fd, response.data(), response.size(), MSG_NOSIGNAL);
                        }
                    } catch (...) {
                        LOG("ERROR", "protocol error from " + client.addr + " fd=" + std::to_string(fd));
                        std::string err = resp_error("ERR protocol error");
                        send(fd, err.data(), err.size(), MSG_NOSIGNAL);
                        closed = true;
                        break;
                    }
                }

                if (closed) {
                    LOG("DISCONNECT", client.addr + " fd=" + std::to_string(fd));
                    epoll_del(epoll_fd_, fd);
                    clients.erase(fd);
                    close(fd);
                }
            }
        }
    }

    LOG("STOP", "shutting down");
}
