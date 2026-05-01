#pragma once
#include "store.h"
#include <string>
#include <vector>

// Dispatches a parsed command to the store and returns a RESP-encoded response.
std::string dispatch(Store& store, const std::vector<std::string>& args);
