cmake_minimum_required(VERSION 3.20)
project(customredis CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_compile_options(-Wall -Wextra -O2)

# ── library (shared between server binary and tests) ──────────────────────────
file(GLOB_RECURSE LIB_SOURCES src/*.cpp)
list(REMOVE_ITEM LIB_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp)

add_library(customredis_lib STATIC ${LIB_SOURCES})
target_include_directories(customredis_lib PUBLIC src)

# ── server binary ─────────────────────────────────────────────────────────────
add_executable(customredis src/main.cpp)
target_link_libraries(customredis PRIVATE customredis_lib)

# ── tests ─────────────────────────────────────────────────────────────────────
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz
  URL_HASH SHA256=7b42b4d6ed48810c5362c265a17faebe90dc2373c885e5216439d37927f02926
  DOWNLOAD_EXTRACT_TIMESTAMP ON
)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()

file(GLOB TEST_SOURCES tests/*.cpp)
add_executable(customredis_tests ${TEST_SOURCES})
target_link_libraries(customredis_tests PRIVATE customredis_lib GTest::gtest_main)
target_include_directories(customredis_tests PRIVATE src)

include(GoogleTest)
gtest_discover_tests(customredis_tests)
