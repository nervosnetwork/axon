package org.nervos.axon;

import java.io.File;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.apache.commons.io.FileUtils;
import org.bouncycastle.util.encoders.Hex;
import org.nervos.ckb.type.Script;
import org.nervos.ckb.utils.Serializer;

// the deployment logic after set up ckb node and indexers
public class DeployCells {
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
        String pathToScripts = args[2];

        Tools tools = new Tools(ckbUrl, ckbIndexerUrl, collatorLockArgs, collatorPrivateKey);

        BigInteger scriptCap = BigInteger.valueOf(6000000);

        Collection<File> scriptNames = FileUtils.listFiles(new File(pathToScripts), null, false);

        Map<String, byte[]> scriptTypeHashes = new HashMap<>();

        for (File scriptFile : scriptNames) {

            System.out.println("processing: " + scriptFile.getAbsolutePath());
            byte[] code = FileUtils.readFileToByteArray(scriptFile);
            String codeHex = "0x" + Hex.toHexString(code);

            Script scriptCellTypeScript = tools.sendCell(codeHex, scriptCap);

            byte[] typeHash = Serializer.serializeScript(scriptCellTypeScript).toBytes();

            scriptTypeHashes.put(scriptFile.getName(), typeHash);
        }

        String gccCellData = "0x5f5f";
        System.out.println("update GCC Cell");

        tools.convertGccCell(gccCellData);
    }
}
