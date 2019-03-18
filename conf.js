// conf.js
exports.config = {
  framework: "jasmine",
  seleniumAddress: "http://localhost:4444/wd/hub",
  params: {
    url: "https://alpha.woovly.com",
    email: "para27rsh@gmail.com",
    password: "123456",
    google_email: "",
    google_password: "",
    fb_email: "",
    fb_password: "",
    excel_path: "/home/shivam/Protractor/data-driven/Woovly_Login.xlsx",
    ran: Math.floor(100000 + Math.random() * 900000),
    ran1: Math.floor(100000 + Math.random() * 900000),
    userEmailid: "tester@gmail.com",
    userEmailPass: "123456",

    inviteEmail: "harishxelpmoc@gmail.com",
    invitePass: "xelp123456",
    uploadImage: "../testData/images/haunted/",
    uploadVideo: "../testData/video"
  },
  specs: ["spec.js"]
};
