package org.nervos.axon;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.bouncycastle.crypto.digests.Blake2bDigest;
import org.bouncycastle.util.encoders.Hex;
import org.nervos.ckb.type.Script;
import org.nervos.ckb.utils.Serializer;

// the deployment logic after set up ckb node and indexers
public class DeployGlobalConfigCell {
    public static final String secp256k1CodeHash =
            "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";
    public static final String typeIdScriptCodeHash =
            "0x00000000000000000000000000000000000000000000000000545950455f4944";
    public static final byte[] CKB_HASH_PERSONALIZATION =
            "ckb-default-hash".getBytes(StandardCharsets.UTF_8);

    public static final String collatorLockArgs = "0xcadffbad61d33d01a97264a893639a857e9f7b17";
    public static final String collatorPrivateKey =
            "0x000491c4231e2d9e1b21c1eac323e4841e743fe5100846975de254afde4ec663";

    public static void main(String[] args) throws IOException, InterruptedException {
        System.out.println("args = " + Arrays.deepToString(args));

        String ckbUrl = args[0];
        String ckbIndexerUrl = args[1];
        String pathToWriteGlobalConfigCellTypeScriptTypeId = args[2];

        Tools tools = new Tools(ckbUrl, ckbIndexerUrl, collatorLockArgs, collatorPrivateKey);

        BigInteger gccCap = BigInteger.valueOf(1000);

        Script gccTypeScript = tools.sendCell("0x1234567890abcdef", gccCap);

        Blake2bDigest blake2b = new Blake2bDigest(null, 32, null, CKB_HASH_PERSONALIZATION);

        // write type hash into file
        byte[] gccTypeSer = Serializer.serializeScript(gccTypeScript).toBytes();
        blake2b.update(gccTypeSer, 0, gccTypeSer.length);

        byte[] gccTypeHash = new byte[32];
        blake2b.doFinal(gccTypeHash, 0);

        System.out.println("gccTypeHash: " + "0x" + Hex.toHexString(gccTypeHash));

        BufferedWriter writer =
                new BufferedWriter(new FileWriter(pathToWriteGlobalConfigCellTypeScriptTypeId));

        String ret = tools.bytesToUintArray(gccTypeHash);
        writer.write(ret);

        writer.close();
    }
}
