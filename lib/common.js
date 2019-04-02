var user_login = require("../pom/login");
var path = require("path");
var fs = require("fs");
var signUp = require("../pom/signup");

var currentdate = new Date();
var datetime =
  "Last Sync: " +
  currentdate.getDate() +
  "/" +
  (currentdate.getMonth() + 1) +
  "/" +
  currentdate.getFullYear() +
  " @ " +
  currentdate.getHours() +
  ":" +
  currentdate.getMinutes() +
  ":" +
  currentdate.getSeconds();

// Cover image upload
const uploadImage = async (dirpath, image_count, locator) => {
  const dirabsolutePath = path.resolve(__dirname, dirpath);
  fs.readdir(dirabsolutePath, (err, files) => {
    browser.sleep(2000);
    for (i = 0; i < image_count; i++) {
      console.log(files[i]);
      var j = user_login.getRandomInt(1, files.length - 1);
      var fullPath = path.resolve(dirabsolutePath, files[j]);
      var absolutePath = path.resolve(__dirname, fullPath);
      browser.sleep(2000);
      var fileElem = locator;
      fileElem.sendKeys(absolutePath);
      browser.sleep(9000);
    }
  });
};
// const uploadImages = function(dirpath, image_count) {
//   var dirabsolutePath = path.resolve(__dirname, dirpath);
//   console.log(dirabsolutePath);
//   fs.readdir(dirabsolutePath, (err, files) => {
//     browser.sleep(1000);
//     for (i = 0; i < image_count; i++) {
//       console.log(files[i]);

//       var j = signUp.getRandomInt(1, files.length - 1);
//       var fullPath = path.resolve(dirabsolutePath, files[j]);
//       console.log(fullPath);
//       var absolutePath = path.resolve(__dirname, fullPath);
//       var fileElem = element(by.css('input[type="file"]'));
//       fileElem.sendKeys(absolutePath);
//       browser.sleep(7000);
//     }
//   });
// };
module.exports = { uploadImage, datetime };
