// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Token {

    string public name = "GigCoin";
    string public symbol = "GIG";
    uint8 public decimals = 18;

    address public owner;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public minters;

    constructor(uint256 supply) {
        owner = msg.sender;
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "Not minter");
        _;
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        minters[account] = allowed;
    }

    function mint(address to, uint256 amount) external onlyMinter returns (bool) {
        totalSupply += amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Balance low");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Balance low");
        require(allowance[from][msg.sender] >= amount, "Allowance low");

        allowance[from][msg.sender] -= amount;

        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        return true;
    }
}
