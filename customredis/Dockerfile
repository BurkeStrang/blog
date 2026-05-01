FROM alpine:3.21 AS builder
RUN apk add --no-cache cmake make g++ linux-headers
WORKDIR /build
COPY . .
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_EXE_LINKER_FLAGS="-static-libstdc++ -static-libgcc" \
 && cmake --build build -j"$(nproc)"

FROM alpine:3.21
RUN addgroup -S redis && adduser -S redis -G redis
COPY --from=builder /build/build/customredis /usr/local/bin/customredis
EXPOSE 6379
USER redis
ENTRYPOINT ["customredis", "6379"]
