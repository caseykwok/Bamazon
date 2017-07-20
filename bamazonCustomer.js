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
	displayProducts();
});

function displayProducts() {
	connection.query("SELECT * FROM products", function(error, results) {
		if (error) throw error;
		console.log("");
		let itemIds = [];
		let data = [];
		results.forEach(function(result) {
			data.push({"Item ID": result.item_id, "Product Name": result.product_name, "Department Name": result.department_name, "Price": result.price, "Stock Quantity": result.stock_quantity});
			itemIds.push(result.item_id);
		});
		console.table(data);
		inquirer.prompt([
			{
				type: "input",
				message: "Which item would you like to purchase?",
				name: "purchaseItemId",
				validate: function(input) {
					if (!input || isNaN(parseFloat(input))) {
						return "Please enter the ID of the product that you would like to purchase.";
					} else if (itemIds.indexOf(parseFloat(input)) === -1) {
						return "The ID you entered is not available. Please enter one of the IDs above.";
					} else {
						return true;
					}
				}
			}, 
			{
				type: "input",
				message: "How many would you like to purchase?",
				name: "purchaseQuantity",
				validate: function(input) {
					if (!input || isNaN(parseFloat(input))) {
						return "Please enter the number of units of the product that you would like to purchase.";
					} else if (parseFloat(input) <= 0) {
						return "Minimum purchase quantity is 1.";
					} else if (parseFloat(input) % 1 !== 0) {
						return "Please enter a whole number (i.e. 1, 2, 3)."; 
					} else {
						return true;
					}
				}
			}
		]).then(function(userResponse) {
			checkQuantity(parseInt(userResponse.purchaseItemId), parseInt(userResponse.purchaseQuantity));
		});
	});
};

function checkQuantity(itemId, purchaseQuantity) {
	let params = {item_id: itemId};
	connection.query("SELECT * FROM products WHERE ?", params, function(error, results) {
		let itemInformation = results[0];
		if (purchaseQuantity > itemInformation.stock_quantity) {
			console.log("");
			console.log("Insufficient stock quantity.");
			console.log("Your order has been cancelled.");
			console.log("");
			purchaseAgain();
		} else {
			updateQuantity(itemId, purchaseQuantity, itemInformation);
		}
	});
};

function updateQuantity(itemId, purchaseQuantity, itemInformation) {
	let params = [{stock_quantity: (itemInformation.stock_quantity - purchaseQuantity), product_sales: (purchaseQuantity * itemInformation.price).toFixed(2)}, {item_id: itemId}];
	connection.query("UPDATE products SET ? WHERE ?", params, function(error, results) {
		if (error) throw error;
		console.log("");
		console.log("Your order for " + purchaseQuantity + " " + itemInformation.product_name + " from the " + itemInformation.department_name + " Department has been processed.");
		console.log("Order Total: $" + (purchaseQuantity * itemInformation.price).toFixed(2));
		console.log("Thanks for shopping with Bamazon!");
		console.log("");
		purchaseAgain();
	});
};

function purchaseAgain() {
	inquirer.prompt([
		{
			type: "list",
			message: "Would you like to continue shopping?",
			choices: ["Yes", "No"],
			name: "continue",
		}
	]).then(function(userResponse) {
		if (userResponse.continue === "Yes") {
			displayProducts();
		} else {
			console.log("Hope to see you again soon!");
			connection.end();
		}
	});
};
