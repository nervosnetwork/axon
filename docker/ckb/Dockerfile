FROM nervos/ckb:v0.42.0

ENV CKB_CHAIN=dev
ENV BA_ARG=0x22c06bdc1eb37dd22a6e55af075f6285aaa45fe6
ENV BA_CODE_HASH=0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8
ENV BA_HASH_TYPE=type
ENV BA_MESSAGE=0x646576

# the default port for rpc and p2p
EXPOSE 8114 8115

COPY --chown=ckb ./dev.toml /var/
COPY --chown=ckb ./entrypoint.sh /bin/

ENTRYPOINT ["/bin/entrypoint.sh"]
