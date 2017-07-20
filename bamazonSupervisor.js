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
			type: "rawlist",
			message: "What would you like to do?",
			choices: ["View Product Sales by Department", "Create New Department", "Exit"],
			name: "action"
		}
	]).then(function(userResponse) {
		let action = userResponse.action;
		switch (action) {
			case "View Product Sales by Department":
				viewProductSales();
				break;
			case "Create New Department":
				createNewDepartment();
				break;
			case "Exit":
				connection.end();
				break;
		};
	});
};

function viewProductSales() {
	connection.query("SELECT departments.department_id AS 'Department ID', departments.department_name AS 'Department Name', departments.over_head_costs AS 'Overhead Costs', IFNULL(q1.product_sales, 0) AS 'Product Sales', (IFNULL(q1.product_sales, 0) - departments.over_head_costs) AS 'Total Profit' FROM departments LEFT JOIN (SELECT department_name, SUM(product_sales) AS product_sales FROM products GROUP BY department_name) AS q1 on departments.department_name = q1.department_name ORDER BY (IFNULL(q1.product_sales, 0) - departments.over_head_costs) DESC;", function(error, results) {
		if (error) throw error;
		console.log("");
		let data = [];
		results.forEach(function(result) {
			data.push({"Department ID": result["Department ID"], "Department Name": result["Department Name"], "Overhead Costs": "$" + result["Overhead Costs"], "Product Sales": "$" + result["Product Sales"].toFixed(2), "Total Profit": "$" + result["Total Profit"].toFixed(2)});
		});
		console.table(data);
		displayMainMenu();
	});
};

function createNewDepartment() {
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
				message: "What department would you like to add?",
				name: "department",
				validate: function(input) {
					if (!input) {
						return "Please enter the name of the department that would you like to add.";
					} else if (departmentNames.indexOf(input) >= 0) {
						return "Department already exists.";
					} else {
						return true;
					}
				}
			},
			{
				type: "input",
				message: "What is the over head cost for the department?",
				name: "overHeadCost",
				validate: function(input) {
					if (!input || isNaN(parseFloat(input))) {
						return "Please enter the over head cost for the department.";
					} else if (parseFloat(input) < 0) {
						return "Minimum over head cost is 0.";
					} else {
						return true;
					}
				}
			}
		]).then(function(userResponse) {
			let params = [userResponse.department, parseFloat(userResponse.overHeadCost)];
			connection.query("INSERT INTO departments (department_name, over_head_costs) VALUES (?, ?)", params, function(error, results) {
				if (error) throw error;
				console.log("");
				console.log("Success! " + userResponse.department + " Department added.");
				console.log("");
				displayMainMenu();
			});
		});
	});
};






