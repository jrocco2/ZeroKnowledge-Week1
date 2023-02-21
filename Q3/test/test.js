const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");
const path = require("path");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe.only("HelloWorld", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("RangeProofVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Circuit should get correct range", async function () {

        const circuit = await wasm_tester("contracts/circuits/RangeProof.circom");

        // Construct the input
        const INPUT = {
            "in": 15,
            "range": [10, 20]
        }

        // Calculate the witness
        const witness = await circuit.calculateWitness(INPUT, true);
        console.log(witness)

        //console.log(witness);

        assert(Fr.eq(Fr.e(witness[0]), Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]), Fr.e(1)));

    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing

        const INPUT = {
            "in": 15,
            "range": [10, 20]
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "contracts/circuits/RangeProof/RangeProof_js/RangeProof.wasm", "contracts/circuits/RangeProof/circuit_final.zkey");

        // console.log('2x3 =', publicSignals[0]);

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});

