#!/bin/sh

if ! [ -f ckb.toml ]; then
  /bin/ckb init --chain "$CKB_CHAIN" \
  --import-spec /var/dev.toml \
  --ba-arg "$BA_ARG" \
  --ba-code-hash "$BA_CODE_HASH" \
  --ba-hash-type "$BA_HASH_TYPE" \
  --ba-message "$BA_MESSAGE"
fi

exec /bin/ckb run &
sleep 3
exec /bin/ckb miner
