#include "server.h"
#include "store.h"
#include <csignal>
#include <cstdlib>
#include <iostream>

static Server* g_server = nullptr;

static void on_signal(int) {
    std::cout << "\nShutting down...\n";
    if (g_server) g_server->stop();
}

int main(int argc, char* argv[]) {
    int port = 6379;
    if (argc == 2) port = std::atoi(argv[1]);

    std::signal(SIGINT,  on_signal);
    std::signal(SIGTERM, on_signal);

    Store store;
    Server server(store, port);
    g_server = &server;

    server.run();
    return 0;
}
