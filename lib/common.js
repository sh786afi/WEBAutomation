var user_login = require("../pom/login");
var path = require("path");
var fs = require("fs");

// Cover image upload
const uploadImage = async (dirpath, image_count) => {
  const dirabsolutePath = path.resolve(__dirname, dirpath);
  fs.readdir(dirabsolutePath, (err, files) => {
    browser.sleep(2000);
    for (i = 0; i < image_count; i++) {
      console.log(files[i]);
      var j = user_login.getRandomInt(1, files.length - 1);
      var fullPath = path.resolve(dirabsolutePath, files[j]);
      var absolutePath = path.resolve(__dirname, fullPath);
      browser.sleep(2000);
      var fileElem = element(by.id("forCoverImage"));
      fileElem.sendKeys(absolutePath);
      browser.sleep(9000);
    }
  });
};
module.exports = { uploadImage };
