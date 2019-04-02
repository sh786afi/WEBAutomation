var { LOCATOR_Featured } = require("../lib/constant");

var likes = {
  oldLikeCount: "",
  newLikeCount: ""
};

likePost = async () => {
  browser.sleep(2000);
  LOCATOR_Featured.likeText.getText().then(text => {
    var str = text;
    oldLikeCount = str.replace(/\D/g, "");
  });
  await LOCATOR_Featured.like.click();
  LOCATOR_Featured.likeText.getText().then(text => {
    var str = text;
    newLikeCount = str.replace(/\D/g, "");
  });
  browser.sleep(1000);
};

module.exports = { likes, likePost };
