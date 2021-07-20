FROM nervos/ckb-docker-builder:bionic-rust-1.45.2 as build-container

WORKDIR /

RUN git clone --branch v0.2.0 --depth 1 https://github.com/nervosnetwork/ckb-indexer.git

WORKDIR /ckb-indexer

RUN cargo build

#================================================================

FROM ubuntu:bionic

COPY --from=build-container \
    /usr/lib/x86_64-linux-gnu/libssl.so.* \
    /usr/lib/x86_64-linux-gnu/libcrypto.so.* \
    /usr/lib/x86_64-linux-gnu/

COPY --from=build-container \
    /ckb-indexer/target/debug/ckb-indexer \
    /bin/

COPY ./entrypoint.sh /bin/

#
EXPOSE 8116

ENTRYPOINT ["/bin/entrypoint.sh"]