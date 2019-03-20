// conf.js
exports.config = {
  framework: "jasmine",
  seleniumAddress: "http://localhost:4444/wd/hub",
  params: {
    url: "https://alpha.woovly.com",
    fb_email: "shivam.parashar@xelpmoc.in",
    fb_password: "para1993",
    excel_path: ""
  },
  specs: ["spec.js"]
};
