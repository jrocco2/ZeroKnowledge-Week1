const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");
const path = require("path");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe("HelloWorld", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Circuit should multiply two numbers correctly", async function () {

        const circuit = await wasm_tester("contracts/circuits/HelloWorld.circom");

        // Construct the input
        const INPUT = {
            "a": 3,
            "b": 3
        }

        // Calculate the witness
        const witness = await circuit.calculateWitness(INPUT, true);
        console.log(witness)

        //console.log(witness);

        assert(Fr.eq(Fr.e(witness[0]), Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]), Fr.e(9)));

    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing

        const { proof, publicSignals } = await groth16.fullProve({ "a": "2", "b": "3" }, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm", "contracts/circuits/HelloWorld/circuit_final.zkey");

        console.log('2x3 =', publicSignals[0]);

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


describe("Multiplier3 with Groth16", function () {
    let Multiplier3Verifier;
    let multiplier3Verifier;

    beforeEach(async function () {
        Multiplier3Verifier = await ethers.getContractFactory("Multiplier3Verifier");
        multiplier3Verifier = await Multiplier3Verifier.deploy();
        await multiplier3Verifier.deployed();
    });

    it("Circuit should multiply three numbers correctly", async function () {
        const circuit = await wasm_tester("contracts/circuits/Multiplier3.circom");

        // Construct the input
        const INPUT = {
            "in1": 3,
            "in2": 3,
            "in3": 2,
        }

        // Calculate the witness
        const witness = await circuit.calculateWitness(INPUT, true);
        console.log(witness)

        //console.log(witness);

        assert(Fr.eq(Fr.e(witness[0]), Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]), Fr.e(18)));
    });

    it("Should return true for correct proof", async function () {

        // Construct the input
        const INPUT = {
            "in1": "3",
            "in2": "3",
            "in3": "2",
        }
        const { proof, publicSignals } = await groth16.fullProve(INPUT, "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm", "contracts/circuits/Multiplier3/circuit_final.zkey");

        console.log('3x3x2 =', publicSignals[0]);

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await multiplier3Verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await multiplier3Verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {
    let Multiplier3VerifierPlonk;
    let multiplier3VerifierPlonk;

    beforeEach(async function () {
        Multiplier3VerifierPlonk = await ethers.getContractFactory("PlonkVerifier");
        multiplier3VerifierPlonk = await Multiplier3VerifierPlonk.deploy();
        await multiplier3VerifierPlonk.deployed();
    });

    it("Should return true for correct proof", async function () {
        // Construct the input
        const INPUT = {
            "in1": "3",
            "in2": "3",
            "in3": "2",
        }
        const { proof, publicSignals } = await plonk.fullProve(INPUT, "contracts/circuits/Multiplier3_plonk/Multiplier3_js/Multiplier3.wasm", "contracts/circuits/Multiplier3_plonk/circuit_final.zkey");

        console.log('3x3x2 =', publicSignals[0]);

        const call = await plonk.exportSolidityCallData(proof, publicSignals)
        
        const calldata = call.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        // This is yuck! But it works for now
        expect(await multiplier3VerifierPlonk.verifyProof(call.split(',')[0], [calldata[1]])).to.be.true;    
    });

    it("Should return false for invalid proof", async function () {
        
        expect(await multiplier3VerifierPlonk.verifyProof(0, [0])).to.be.false;
    });
});