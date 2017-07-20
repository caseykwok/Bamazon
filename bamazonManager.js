var inquirer = require("inquirer");
var mysql = require("mysql");
var table = require("console.table");

var connection = mysql.createConnection({
	host: "localhost",
	port: 3306,
	user: "root",
	password: "",
	database: "bamazon"
});

connection.connect(function(error) {
	if (error) throw error;
	displayMainMenu();
});

function displayMainMenu() {
	inquirer.prompt([
		{
			type: "list",
			message: "What would you like to do?",
			choices: ["View Products for Sale", "View Low Inventory", "Add to Inventory", "Add New Product", "Exit"],
			name: "action"
		}
	]).then(function(userResponse) {
		let action = userResponse.action;
		switch (action) {
			case "View Products for Sale":
				displayProducts();
				break;
			case "View Low Inventory":
				viewLowInventory();
				break;
			case "Add to Inventory":
				addToInventory();
				break;
			case "Add New Product":
				addNewProduct();
				break;
			case "Exit":
				connection.end();
				break;
		};
	});
};

function displayProducts() {
	connection.query("SELECT * FROM products", function(error, results) {
		if (error) throw error;
		console.log("");
		let data = [];
		results.forEach(function(result) {
			data.push({"Item ID": result.item_id, "Product Name": result.product_name, "Department Name": result.department_name, "Price": result.price, "Stock Quantity": result.stock_quantity});
		});
		console.table(data);
		displayMainMenu();
	});
};

function viewLowInventory() {
	connection.query("SELECT * FROM products WHERE stock_quantity < 5", function(error, results) {
		if (error) throw error;
		console.log("");
		let data = [];
		results.forEach(function(result) {
			data.push({"Item ID": result.item_id, "Product Name": result.product_name, "Department Name": result.department_name, "Price": result.price, "Stock Quantity": result.stock_quantity});
		});
		console.table(data);
		displayMainMenu();
	});
};

function addToInventory() {
	connection.query("SELECT * FROM products", function(error, results) {
		if (error) throw error;
		let itemIds = [];
		results.forEach(function(result) {
			itemIds.push(result.item_id);
		});
		connection.query("SELECT * FROM products", function(error, results) {
			if (error) throw error;
			console.log("");
			let data = [];
			results.forEach(function(result) {
				data.push({"Item ID": result.item_id, "Product Name": result.product_name, "Department Name": result.department_name, "Price": result.price, "Stock Quantity": result.stock_quantity});
			});
			console.table(data);
			inquirer.prompt([
				{
					type: "input",
					message: "Which item would you like to restock?",
					name: "restockItemId",
					validate: function(input) {
						if (!input) {
							return "Please enter the ID of the item that you would like to restock."
						} else if (itemIds.indexOf(parseFloat(input)) === -1) {
							return "The ID you entered is not in the inventory.";
						} else {
							return true;
						}
					}
				}, 
				{
					type: "input",
					message: "How many would you like to restock?",
					name: "restockQuantity",
					validate: function(input) {
						if (!input || isNaN(parseFloat(input))) {
							return "Please enter the number of units of the product that you would like to restock.";
						} else if (parseFloat(input) <= 0) {
							return "Minimum restock quantity is 1.";
						} else if (parseFloat(input) % 1 !== 0) {
							return "Please enter a whole number (i.e. 1, 2, 3).";
						} else {
							return true;
						}
					}
				}
			]).then(function(userResponse) {
				updateQuantity(parseFloat(userResponse.restockItemId), parseFloat(userResponse.restockQuantity));
			});
		});
	});
};

function updateQuantity(itemId, restockQuantity) {
	let params = {item_id: itemId};
	connection.query("SELECT * FROM products WHERE ?", params, function(error, results) {
		let itemInformation = results[0];
		let newQuantity = itemInformation.stock_quantity + restockQuantity;
		params = [{stock_quantity: newQuantity}, {item_id: itemId}];
		connection.query("UPDATE products SET ? WHERE ?", params, function(error, results) {
			if (error) throw error;
			console.log("");
			console.log("Success! Item restocked.");
			console.log("There are now " + newQuantity + " units of " + itemInformation.product_name + " from the " + itemInformation.department_name + " Department in the inventory.");
 			console.log("");
 			displayMainMenu();
		});
	});
};

function addNewProduct() {
	connection.query("SELECT * FROM departments", function(error, results) {
		if (error) throw error;
		let departmentNames = [];
		results.forEach(function(result) {
			if (departmentNames.indexOf(result.department_name) === -1) {
				departmentNames.push(result.department_name);
			}
		});
		inquirer.prompt([
			{
				type: "input",
				message: "What is the name of the product?",
				name: "name",
				validate: function(input) {
					if (!input) {
						return "Please provide the name of the product.";
					} else {
						return true;
					}
				}
			},
			{
				type: "list",
				message: "What department does the product belong in?",
				choices: departmentNames,
				name: "department"
			},
			{
				type: "input",
				message: "What is the price per unit of the product?",
				name: "price",
				validate: function(input) {
					if (!input || isNaN(parseFloat(input))) {
						return "Please provide the price per unit of the product.";
					} else if (parseFloat(input) <= 0) {
						return "Minimum price per unit is $0.01.";
					} else {
						return true;
					}
				}
			},
			{
				type: "input",
				message: "What is the stock quantity of the product?",
				name: "stockQuantity",
				validate: function(input) {
					if (!input || isNaN(parseFloat(input))) {
						return "Please provide the number of available units for sale.";
					} else if (parseFloat(input) <= 0) {
						return "Minimum available unit is 1.";
					} else if (parseFloat(input) % 1 !== 0) {
						return "Please enter a whole number (i.e. 1, 2, 3)."; 
					} else {
						return true;
					}
				}
			}
		]).then(function(userResponse) {
			checkItemExists(userResponse);
		});
	});
};

function checkItemExists(userResponse) {
	let userItem = {"product_name": userResponse.name.toLowerCase(), "department_name": userResponse.department, "price": parseFloat(userResponse.price)};
	let exists = false;
	connection.query("SELECT * FROM products", function(error, results) {
		if (error) throw error;
		results.forEach(function(result) {
			let stockItem = {"product_name": result.product_name.toLowerCase(), "department_name": result.department_name.toLowerCase(), "price": result.price};
			if (JSON.stringify(userItem) === JSON.stringify(stockItem)) {
				exists = true;
			}
		});
		if (exists) {
			console.log("");
			console.log("This item already exists in the inventory.");
			console.log("");
			displayMainMenu();
		} else {
			let params = [userResponse.name, userResponse.department, userResponse.price, userResponse.stockQuantity];
			connection.query("INSERT INTO products (product_name, department_name, price, stock_quantity) VALUES (?, ?, ?, ?)", params, function(error, results) {
				if (error) throw error;
				console.log("");
				console.log("Success! Product added!");
				console.log("There are " + userResponse.stockQuantity + " units of " + userResponse.name + " from the " + userResponse.department + " Department priced at $" + userResponse.price + " each added to the inventory.");
				console.log("");
				displayMainMenu();
			});
		}
	});
};


