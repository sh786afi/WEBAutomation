var data = require("../conf.js");
var { uploadImage } = require("../lib/common.js");
var { LOCATOR_STORY } = require("../lib/constant");
var AddStory = function() {
  // ============ Add Story =============

  async function clickAdd() {
    await LOCATOR_STORY.click_add.click();
  }

  async function clickAddStory() {
    await LOCATOR_STORY.click_add_story.click();
  }

  async function enterBLIName(Bkt_name) {
    await LOCATOR_STORY.enter_bLI.click();
    await LOCATOR_STORY.enter_bLI.sendKeys(Bkt_name);
  }

  async function clickYes() {
    await LOCATOR_STORY.click_yes.click();
  }

  async function clickNo() {
    await LOCATOR_STORY.click_no.click();
  }

  async function clickImDone() {
    await LOCATOR_STORY.click_done.click();
  }

  async function selectDropdown() {
    await LOCATOR_STORY.select_dropdown.click();
  }

  async function enterDate(month) {
    await LOCATOR_STORY.enter_date.click();
    await LOCATOR_STORY.enter_date.sendKeys(month);
  }

  async function enterYear(year) {
    await LOCATOR_STORY.enter_year.click();
    await LOCATOR_STORY.enter_year.sendKeys(year);
  }

  async function clickNext() {
    await LOCATOR_STORY.click_next.click();
  }

  async function coverImageClick() {
    await LOCATOR_STORY.cover_image.click();
  }

  async function sendTitle(title) {
    await LOCATOR_STORY.click_title.click();
    await LOCATOR_STORY.click_title.sendKeys(title);
  }

  async function clickImageVideo() {
    await LOCATOR_STORY.click_image_video.click();
  }

  async function clickAddText() {
    await LOCATOR_STORY.click_add_text.click();
  }

  async function textTitle1(title) {
    await LOCATOR_STORY.text_title1.click();
    await LOCATOR_STORY.text_title1.sendKeys(title);
  }

  async function addDescription1(Desc) {
    await LOCATOR_STORY.add_description1.click();
    await LOCATOR_STORY.add_description1.sendKeys(Desc);
  }

  async function textTitle2(title) {
    await LOCATOR_STORY.text_title2.click();
    await LOCATOR_STORY.text_title2.sendKeys(title);
  }

  async function addDescription2(Desc) {
    await LOCATOR_STORY.add_description2.click();
    await LOCATOR_STORY.add_description2.sendKeys(Desc);
  }

  async function clickBack() {
    await LOCATOR_STORY.click_back.click();
  }

  async function saveStory() {
    await LOCATOR_STORY.save_story.click();
  }

  async function publishStory() {
    await LOCATOR_STORY.publish_story.click();
  }

  async function clickYesToPublish() {
    await LOCATOR_STORY.click_publish_yes.click();
  }

  async function backgroundText() {
    await LOCATOR_STORY.background_text.click();
  }

  async function textAlign() {
    await LOCATOR_STORY.text_align.click();
  }

  async function textFont() {
    await LOCATOR_STORY.text_font.click();
  }

  // ============= Output Created Story Function ==============

  this.Get_New_Story1 = async function(BLIname) {
    await clickAdd();
    await clickAddStory();
    await enterBLIName(BLIname);
    await selectDropdown();
    await clickNext();
    browser.sleep(4000);
    await uploadImage(data.config.params.uploadImage, 1);
    browser.sleep(10000);
    await sendTitle("Automated Story id" + " " + data.config.params.ran);
    console.log(data.config.params.ran);
    browser.sleep(4000);
    await clickAddText();
    await textTitle1("Chennai");
    browser.sleep(2000);
    browser.executeScript("window.scrollTo(0,500)");
    browser.sleep(3000);
    await addDescription1(
      "Chennai, on the Bay of Bengal in eastern India, is the capital of the state of Tamil Nadu. The city is home to Fort St. George, built in 1644 and now a museum showcasing the city’s roots as a British military garrison and East India Company trading outpost, when it was called Madras. Religious sites include Kapaleeshwarar Temple, adorned with carved and painted gods, and St. Mary’s, a 17th-century Anglican church"
    );
    browser.sleep(5000);
    await backgroundText();
    browser.sleep(2000);
    await textAlign();
    browser.sleep(2000);
    await publishStory();
    browser.sleep(2000);
    await clickYesToPublish();
  };

  this.Get_New_Story2 = async function(BLIname) {
    await clickAdd();
    await clickAddStory();
    await enterBLIName(BLIname);
    await selectDropdown();
    await clickNext();
    browser.sleep(4000);
    await uploadImage(data.config.params.uploadImage, 1);
    browser.sleep(15000);
    await sendTitle("Automated Story id" + " " + data.config.params.ran1);
    console.log(data.config.params.ran1);
    browser.sleep(4000);
    await clickAddText();
    await textTitle1("The Himalayas");
    browser.sleep(2000);
    browser.executeScript("window.scrollTo(0,500)");
    browser.sleep(3000);
    await addDescription1(
      "The Himalayas, or Himalaya, form a mountain range in Asia, separating the plains of the Indian subcontinent from the Tibetan Plateau. The Himalayan range has many of the Earth's highest peaks, including the highest, Mount Everest."
    );
    browser.sleep(5000);
    await backgroundText();
    browser.sleep(2000);
    await textFont();
    browser.sleep(2000);
    await saveStory();
    browser.sleep(2000);
  };
};
module.exports = new AddStory();
