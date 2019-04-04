var { LOCATOR_Featured, LOCATOR_Story } = require("../lib/constant");

likeStory = async () => {
  browser.sleep(2000);
  await LOCATOR_Featured.story_top.click();
  browser.sleep(2000);
  LOCATOR_Story.click_story.click();
  browser.sleep(2000);
  LOCATOR_Story.like_story.click();
  browser.sleep(5000);
};

module.exports = { likeStory };
