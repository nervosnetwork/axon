package org.nervos.axon;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.bouncycastle.crypto.digests.Blake2bDigest;
import org.bouncycastle.util.encoders.Hex;
import org.nervos.ckb.indexer.CkbIndexerApi;
import org.nervos.ckb.indexer.CkbIndexerCells;
import org.nervos.ckb.indexer.SearchKey;
import org.nervos.ckb.service.Api;
import org.nervos.ckb.transaction.ScriptGroup;
import org.nervos.ckb.transaction.Secp256k1SighashAllBuilder;
import org.nervos.ckb.type.OutPoint;
import org.nervos.ckb.type.Script;
import org.nervos.ckb.type.Witness;
import org.nervos.ckb.type.cell.CellDep;
import org.nervos.ckb.type.cell.CellInput;
import org.nervos.ckb.type.cell.CellOutput;
import org.nervos.ckb.type.fixed.UInt64;
import org.nervos.ckb.type.transaction.Transaction;
import org.nervos.ckb.type.transaction.TransactionWithStatus;
import org.nervos.ckb.utils.Serializer;

@AllArgsConstructor
public class Tools {

    public static final String secp256k1CodeHash =
            "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";
    public static final String typeIdScriptCodeHash =
            "0x00000000000000000000000000000000000000000000000000545950455f4944";
    public static final byte[] CKB_HASH_PERSONALIZATION =
            "ckb-default-hash".getBytes(StandardCharsets.UTF_8);

    public static final String collatorLockArgs = "0xcadffbad61d33d01a97264a893639a857e9f7b17";
    public static BigInteger miningFee = BigInteger.valueOf(100);

    public String ckbUrl;
    public String ckbIndexerUrl;
    public String lockArgs;
    public String privateKey;

    /*
    ckb cell -> ckb cell
             -> ?? cell
    */

    // give compose a cell and send it, return de typeScrip of the cell
    public Script sendCell(String cellData, BigInteger cellCapInCkb)
            throws IOException, InterruptedException {
        Api api = new Api(ckbUrl);
        CkbIndexerApi indexerApi = new CkbIndexerApi(ckbIndexerUrl);

        // wait the indexer to catch up with node
        //        BigInteger apiTip = api.getTipBlockNumber();
        //        while(true){
        //            BigInteger indexerTip = indexerApi.getTip();
        //        }
        Thread.sleep(10 * 1000);

        List<String> outputDataLenRange = new ArrayList<>();
        outputDataLenRange.add("0x0");
        outputDataLenRange.add("0x1");
        CkbIndexerCells inputCells =
                indexerApi.getCells(
                        new SearchKey(
                                new Script(secp256k1CodeHash, lockArgs, Script.TYPE),
                                "lock",
                                new SearchKey.Filter(null, null, outputDataLenRange, null, null)),
                        "asc",
                        BigInteger.valueOf(100),
                        "0x");

        if (inputCells.objects.size() != 1) {
            throw new IOException("more than 1 ckb cell");
        }

        CkbIndexerCells.Cell input = inputCells.objects.get(0);

        System.out.println("using ckb cell: " + input.outPoint.txHash + ":" + input.outPoint.index);

        CellInput cellInput = new CellInput(input.outPoint, "0x0");
        byte[] inputCellMoleculeBytes = Serializer.serializeCellInput(cellInput).toBytes();

        // calc typeid
        Blake2bDigest blake2b = new Blake2bDigest(null, 32, null, CKB_HASH_PERSONALIZATION);

        // If there's only one output cell with current
        // TYPE_ID script, we are creating such a cell,
        // we also need to validate that the first argument matches
        // the hash of following items concatenated:
        // 1. First CellInput of the transaction.
        // 2. Index of the first output cell in current script group.
        // typeid = hash(first input cell of tx || first output cell of script group(typid script
        // group))
        blake2b.update(inputCellMoleculeBytes, 0, inputCellMoleculeBytes.length);

        byte[] ONE = new UInt64(1).toBytes();
        blake2b.update(ONE, 0, ONE.length);

        byte[] out = new byte[32];
        blake2b.doFinal(out, 0);

        String typeId = append0x(Hex.toHexString(out));

        System.out.println("typeId: " + typeId);

        BigInteger inputCap = convertShannonHexStringToBigInteger(input.output.capacity);

        BigInteger remainingCap = inputCap.subtract(cellCapInCkb).subtract(miningFee);

        // change
        CellOutput outputCkb =
                new CellOutput(
                        convertBigIntegerToShannonHexString(remainingCap),
                        // lock
                        new Script(secp256k1CodeHash, collatorLockArgs, Script.TYPE));

        // out scriptCell
        CellOutput outputScriptCell =
                new CellOutput(
                        convertBigIntegerToShannonHexString(cellCapInCkb),
                        new Script(secp256k1CodeHash, collatorLockArgs, Script.TYPE), // lock
                        new Script(typeIdScriptCodeHash, typeId, Script.TYPE) // type
                        );

        List<CellDep> cellDeps = new ArrayList<>(1);
        cellDeps.add(
                new CellDep(
                        new OutPoint(
                                "0x97f337fcefb7d7a8881ad4125302e53121804a6a01800921fb41e1069d11adab",
                                "0x0"),
                        CellDep.DEP_GROUP));

        List<String> outputData = new ArrayList<>(2);
        outputData.add("0x");
        outputData.add(cellData);

        List<Witness> witnesses = new ArrayList<>(2);
        witnesses.add(new Witness());

        // somehow get the typeid
        Transaction tx =
                new Transaction(
                        "0x0",
                        cellDeps,
                        new ArrayList<>(),
                        Collections.singletonList(cellInput),
                        Arrays.asList(outputCkb, outputScriptCell),
                        outputData,
                        witnesses);

        Secp256k1SighashAllBuilder secp256k1 = new Secp256k1SighashAllBuilder(tx);

        secp256k1.sign(new ScriptGroup(new ArrayList<>(Collections.singletonList(0))), privateKey);

        String txHash = api.sendTransaction(tx);

        while (true) {
            TransactionWithStatus status = api.getTransaction(txHash);
            if (!StringUtils.equals(
                    status.txStatus.status, TransactionWithStatus.Status.COMMITTED.getValue())) {
                Thread.sleep(5 * 1000);
                continue;
            }
            break;
        }

        System.out.println("sendCell tx: " + txHash);

        return outputScriptCell.type;
    }

    public void convertGccCell(String cellData) throws IOException {
        Api api = new Api(ckbUrl);
        CkbIndexerApi indexerApi = new CkbIndexerApi(ckbIndexerUrl);

        List<String> outputDataLenRange = new ArrayList<>();
        outputDataLenRange.add("0x8");
        outputDataLenRange.add("0x9");
        CkbIndexerCells inputCells =
                indexerApi.getCells(
                        new SearchKey(
                                new Script(secp256k1CodeHash, lockArgs, Script.TYPE),
                                "lock",
                                new SearchKey.Filter(null, null, outputDataLenRange, null, null)),
                        "asc",
                        BigInteger.valueOf(100),
                        "0x");

        if (inputCells.objects.size() != 1) {
            throw new IOException("more than 1 ckb cell");
        }

        CkbIndexerCells.Cell input = inputCells.objects.get(0);

        if (!StringUtils.equals(input.outputData, "0x1234567890abcdef")) {
            throw new IOException("the waiting gcc cell is missing");
        }

        CellInput cellInput = new CellInput(input.outPoint, "0x0");

        System.out.println("using ckb cell: " + input.outPoint.txHash + ":" + input.outPoint.index);

        BigInteger inputCap = convertShannonHexStringToBigInteger(input.output.capacity);

        BigInteger outCap = inputCap.subtract(miningFee);

        // out
        CellOutput outputScriptCell =
                new CellOutput(
                        convertBigIntegerToShannonHexString(outCap),
                        input.output.lock, // lock
                        input.output.type // type
                        );

        List<CellDep> cellDeps = new ArrayList<>(1);
        cellDeps.add(
                new CellDep(
                        new OutPoint(
                                "0x97f337fcefb7d7a8881ad4125302e53121804a6a01800921fb41e1069d11adab",
                                "0x0"),
                        CellDep.DEP_GROUP));

        List<String> outputData = new ArrayList<>(1);
        outputData.add(cellData);

        List<Witness> witnesses = new ArrayList<>(2);
        witnesses.add(new Witness());

        // somehow get the typeid
        Transaction tx =
                new Transaction(
                        "0x0",
                        cellDeps,
                        new ArrayList<>(),
                        Collections.singletonList(cellInput),
                        Collections.singletonList(outputScriptCell),
                        outputData,
                        witnesses);

        Secp256k1SighashAllBuilder secp256k1 = new Secp256k1SighashAllBuilder(tx);

        secp256k1.sign(new ScriptGroup(new ArrayList<>(Collections.singletonList(0))), privateKey);

        String txHash = api.sendTransaction(tx);

        System.out.println("convertGccCell tx: " + txHash);
    }

    public String bytesToUintArray(byte[] input) {
        if (input == null) return "null";
        int iMax = input.length - 1;
        if (iMax == -1) return "[]";

        StringBuilder b = new StringBuilder();
        b.append('[');
        for (int i = 0; ; i++) {
            b.append(Byte.toUnsignedInt(input[i]));
            if (i == iMax) return b.append(']').toString();
            b.append(", ");
        }
    }

    public String remove0x(String input) {
        if (input.startsWith("0x")) {
            input = input.substring(2);
        }
        return input;
    }

    public String append0x(String input) {
        if (!input.startsWith("0x")) {
            input = "0x" + input;
        }
        return input;
    }

    public BigInteger convertShannonHexStringToBigInteger(String input) {
        BigInteger ret = new BigInteger(remove0x(input), 16);
        return ret.divide(BigInteger.valueOf(100000000));
    }

    public String convertBigIntegerToShannonHexString(BigInteger input) {
        input = input.multiply(BigInteger.valueOf(100000000));
        String ret = input.toString(16);
        return append0x(ret);
    }
}
