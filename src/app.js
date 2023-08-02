import http from "http";
import dotenv from "dotenv";
import { readFileSyncCustom } from "./helpers/readFile.helper.js";
import { writeFileSyncCustom } from "./helpers/writeFile.helper.js";
import { sign, verify } from "./helpers/jwt.js";
import jwt from "jsonwebtoken";

dotenv.config();

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url.split("/")[1];

  // mini helpers --------------------------------------------------------------

  const responseHelper = { "Content-Type": "application/json" };

  const checkUser = (accessToken) => {
    try {
      const { id, role } = verify(accessToken);

      const user = readFileSyncCustom("users.json").find((e) => e.id == id);

      if (!user) {
        res.writeHead(401, responseHelper);
        res.end(
          JSON.stringify({
            message: "Unknown",
          })
        );
        return;
      }

      if (role !== "administrator") {
        res.writeHead(401, responseHelper);
        res.end(
          JSON.stringify({
            message: "You are not admin",
          })
        );
        return;
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.writeHead(401, responseHelper);
        res.end(
          JSON.stringify({
            message: "Token expired",
          })
        );
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.writeHead(401, responseHelper);
        res.end(
          JSON.stringify({
            message: "Token invalid",
          })
        );
        return;
      }
    }
  };

  // ---------------------------------------------------------------------

  if (method === "GET") {
    if (url == "markets") {
      const accessToken = req.headers["authorization"];
      const { role } = verify(accessToken);

      const marketId = req.url.split("/")[2];

      const markets = readFileSyncCustom("markets.json");
      const branches = readFileSyncCustom("branches.json");
      const products = readFileSyncCustom("products.json");
      const employees = readFileSyncCustom("employees.json");

      const market = markets.find((e) => e.id == marketId);
      const branch = branches.find((e) => e.id == marketId);

      if (!market) {
        res.writeHead(404, responseHelper);
        return res.end(
          JSON.stringify({
            message: "Nor Found",
          })
        );
      }

      const productBranches = products
        .filter((e) => e.branchId == marketId)
        .filter((e) => delete e.branchId);
      const employeesBranches = employees
        .filter((e) => e.branchId == marketId)
        .filter((e) => delete e.branchId);
      const marketBranches = branches
        .filter((e) => e.marketId == marketId)
        .filter((e) => delete e.marketId);

      if (role == "person") {
        market.branches = marketBranches;
        branch.products = productBranches;
      } else {
        market.branches = marketBranches;
        branch.products = productBranches;
        branch.employees = employeesBranches;
      }

      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          market,
        })
      );
    } else if (url == "branches") {
      const branchId = req.url.split("/")[2];

      const allBranches = readFileSyncCustom("branches.json");

      const branch = allBranches.find((e) => e.id == branchId);

      if (!branchId) {
        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            allBranches,
          })
        );
        return;
      } else if (!branch) {
        res.writeHead(404, responseHelper);
        res.end(
          JSON.stringify({
            message: "Nor Found",
          })
        );
        return;
      }
      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          branch,
        })
      );
    } else if (url == "products") {
      const productId = req.url.split("/")[2];

      const allProduct = readFileSyncCustom("products.json");

      const product = allProduct.find((e) => e.id == productId);

      if (!productId) {
        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            allProduct,
          })
        );
        return;
      } else if (!product) {
        res.writeHead(404, responseHelper);
        res.end(
          JSON.stringify({
            message: "Nor Found",
          })
        );
        return;
      }
      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          product,
        })
      );
    }
  }

  // Get is finished ----------------------------------------------------------------

  if (method === "POST") {
    if (url == "signIn") {
      req.on("data", (chunk) => {
        const { username, password } = JSON.parse(chunk);

        const users = readFileSyncCustom("users.json");

        const user = users.find(
          (e) => e.username == username && e.password == password
        );

        if (!user) {
          res.writeHead(401, responseHelper);
          res.end(
            JSON.stringify({
              message: "Unauthorized",
            })
          );
          return;
        }

        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            message: "Authorized",
            accessToken: sign({ id: user.id, role: user.role }),
          })
        );
        return;
      });
      return;
    } else if (url == "markets") {
      const accessToken = req.headers["authorization"];

      checkUser(accessToken);

      req.on("data", (chunk) => {
        const { name } = JSON.parse(chunk);

        const allMarkets = readFileSyncCustom("markets.json");

        const market = allMarkets.find((e) => e.name == name);

        if (market) {
          res.writeHead(409, responseHelper);
          res.end(
            JSON.stringify({
              message: "Already exists",
            })
          );
          return;
        }

        allMarkets.push({
          id: allMarkets.at(-1)?.id + 1 || 1,
          name,
        });

        writeFileSyncCustom("markets.json", allMarkets);

        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            message: "Success",
          })
        );
      });
    } else if (url == "employees") {
      const accessToken = req.headers["authorization"];

      checkUser(accessToken);

      req.on("data", (chunk) => {
        const { fullName, gender, branchId } = JSON.parse(chunk);

        const allEmployees = readFileSyncCustom("employees.json");

        const employees = allEmployees.find(
          (e) =>
            e.fullName == fullName &&
            e.gender == gender &&
            e.branchId == branchId
        );

        if (employees) {
          res.writeHead(409, responseHelper);
          res.end(
            JSON.stringify({
              message: "Already exists",
            })
          );
          return;
        }
        allEmployees.push({
          id: allEmployees.at(-1)?.id + 1 || 1,
          fullName,
          gender,
          branchId,
        });

        writeFileSyncCustom("employees.json", allEmployees);

        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            message: "Success",
          })
        );
      });
    } else if (url == "branches") {
      const accessToken = req.headers["authorization"];

      checkUser(accessToken);

      req.on("data", (chunk) => {
        const { title, marketId } = JSON.parse(chunk);

        const allBranches = readFileSyncCustom("branches.json");

        const branch = allBranches.find(
          (e) => e.title == title && e.marketId == marketId
        );

        if (branch) {
          res.writeHead(409, responseHelper);
          res.end(
            JSON.stringify({
              message: "Already exists",
            })
          );
          return;
        }
        allBranches.push({
          id: allBranches.at(-1)?.id + 1 || 1,
          title,
          marketId,
        });

        writeFileSyncCustom("branches.json", allBranches);

        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            message: "Success",
          })
        );
      });
    } else if (url == "products") {
      const accessToken = req.headers["authorization"];

      checkUser(accessToken);

      req.on("data", (chunk) => {
        const { title, price, branchId } = JSON.parse(chunk);
        console.log(JSON.parse(chunk));

        const allProducts = readFileSyncCustom("products.json");

        const product = allProducts.find(
          (e) => e.title == title && e.price == price && e.branchId == branchId
        );

        if (product) {
          res.writeHead(409, responseHelper);
          res.end(
            JSON.stringify({
              message: "Already exists",
            })
          );
          return;
        }
        allProducts.push({
          id: allProducts.at(-1)?.id + 1 || 1,
          title,
          price,
          branchId,
        });

        writeFileSyncCustom("products.json", allProducts);

        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            message: "Success",
          })
        );
      });
    }
  }

  // Post is finished ----------------------------------------------------------------

  if (method === "DELETE") {
    if (url === "markets") {
      const accessToken = req.headers["authorization"];
      checkUser(accessToken);

      const marketId = req.url.split("/")[2];

      const markets = readFileSyncCustom("markets.json");
      const branches = readFileSyncCustom("branches.json");
      const products = readFileSyncCustom("products.json");

      const marketIndex = markets.findIndex(e => e.id == marketId)
      const branchIndex = branches.findIndex((e) => e.marketId == marketId);
      const productIndex = products.findIndex((e) => e.branchId == marketId);

      if (marketIndex === -1 && branchIndex === -1 && productIndex === -1) {
        res.writeHead(404, responseHelper);
        return res.end(
          JSON.stringify({
            message: "Not Found",
          })
        );
      }

      markets.splice(marketIndex, 1);
      branches.splice(branchIndex, 1);
      products.splice(productIndex, 1);

      writeFileSyncCustom("markets.json", markets);
      writeFileSyncCustom("branches.json", branches);
      writeFileSyncCustom("products.json", products);

      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          message: "Market deleted successfully",
        })
      );
    } else if (url === "employees") {
      const accessToken = req.headers["authorization"];
      checkUser(accessToken);

      const employeeId = req.url.split("/")[2];
      const employees = readFileSyncCustom("employees.json");

      const employeeIndex = employees.findIndex((e) => e.id == employeeId);

      if (employeeIndex === -1) {
        res.writeHead(404, responseHelper);
        return res.end(
          JSON.stringify({
            message: "Not Found",
          })
        );
      }

      employees.splice(employeeIndex, 1);

      writeFileSyncCustom("employees.json", employees);

      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          message: "Employee deleted successfully",
        })
      );
    } else if (url === "branches") {
      const accessToken = req.headers["authorization"];
      checkUser(accessToken);

      const branchId = req.url.split("/")[2];
      const branches = readFileSyncCustom("branches.json");

      const branchIndex = branches.findIndex((e) => e.id == branchId);

      if (branchIndex === -1) {
        res.writeHead(404, responseHelper);
        return res.end(
          JSON.stringify({
            message: "Not Found",
          })
        );
      }

      branches.splice(branchIndex, 1);

      writeFileSyncCustom("branches.json", branches);

      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          message: "Branch deleted successfully",
        })
      );
    } else if (url === "products") {
      const accessToken = req.headers["authorization"];
      checkUser(accessToken);

      const productId = req.url.split("/")[2];
      const products = readFileSyncCustom("products.json");

      const productIndex = products.findIndex((e) => e.id == productId);

      if (productIndex === -1) {
        res.writeHead(404, responseHelper);
        return res.end(
          JSON.stringify({
            message: "Not Found",
          })
        );
      }

      products.splice(productIndex, 1);

      writeFileSyncCustom("products.json", products);

      res.writeHead(200, responseHelper);
      res.end(
        JSON.stringify({
          message: "Product deleted successfully",
        })
      );
    }
  }

  // Delete is finished ----------------------------------------------------------------

  if (method === "PUT") {
    if (url === "markets") {
      const accessToken = req.headers["authorization"];

      checkUser(accessToken);

      const marketId = req.url.split("/")[2];
      const markets = readFileSyncCustom("markets.json");

      const marketIndex = markets.findIndex((e) => e.id == marketId);

      if (marketIndex === -1) {
        res.writeHead(404, responseHelper);
        return res.end(
          JSON.stringify({
            message: "Not Found",
          })
        );
      }

      req.on("data", (chunk) => {
        const { name } = JSON.parse(chunk);

        const changeMarket = markets.find(
          (e) => e.name == name && e.id != marketId
        );

        if (changeMarket) {
          res.writeHead(409, responseHelper);
          res.end(
            JSON.stringify({
              message: "Market is already existed",
            })
          );
          return;
        }

        markets[marketIndex].name = name;
        writeFileSyncCustom("markets.json", markets);

        res.writeHead(200, responseHelper);
        res.end(
          JSON.stringify({
            message: "Market updated successfully",
          })
        );
      });
    }
  }

  // Put did not finish until the end ----------------------------------------------------------------
});

server.listen(9000, () => {
  console.log("Running...");
});


const baz = document.querySelectorAll("button")
console.log(baz)

