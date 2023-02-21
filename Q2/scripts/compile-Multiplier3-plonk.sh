#!/bin/bash

cd contracts/circuits

mkdir Multiplier3_plonk

if [ -f ./powersOfTau28_hez_final_10.ptau ]; then
    echo "powersOfTau28_hez_final_10.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_10.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau
fi

echo "Compiling Multiplier3Plonk.circom..."

# compile circuit

circom Multiplier3Plonk.circom --r1cs --wasm --sym -o Multiplier3
snarkjs r1cs info Multiplier3_plonk/Multiplier3.r1cs

# Start a new zkey
# With plonk we don't need to make a contribution

snarkjs plonk setup Multiplier3_plonk/Multiplier3.r1cs powersOfTau28_hez_final_10.ptau Multiplier3_plonk/circuit_final.zkey

# generate solidity contract
snarkjs zkey export solidityverifier Multiplier3_plonk/circuit_final.zkey ../Multiplier3VerifierPlonk.sol

cd ../..

