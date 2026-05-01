#pragma once
#include "store.h"
#include <string>

class Server {
public:
    Server(Store& store, int port);
    ~Server();

    void run();    // blocks; call stop() from signal handler
    void stop();

private:
    Store& store_;
    int port_;
    int listen_fd_ = -1;
    int epoll_fd_  = -1;
    bool running_  = false;

    void handle_client(int fd);
};
