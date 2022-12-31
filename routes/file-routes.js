const express = require("express");
const router = express.Router();
const validator = require("email-validator");
const FileModel = require("../models/file-model");
const multerUpload = require("../utils/multer");
const sendEmail = require("../utils/nodemailer");

/*
 *  @ method  POST
 *  @ route   http://domain/api/files
 *  @ task    Save file to storage and database
 */

router.post("/", (req, res) => {
  try {
    multerUpload(req, res, async (err) => {
      // Validate incoming file
      if (!req.file) {
        return res.status(500).json({
          message: "Please select a valid file",
        });
      }
      if (err) {
        return res.status(500).json({
          message: "Something went wrong!",
        });
      }
      // Store the file in database
      const file = await FileModel.create({
        name: req.file.filename,
        size: req.file.size,
        path: req.file.path,
      });
      // Send Response
      return res.status(201).send({
        downloadPage: `${process.env.API_URL}/api/files/${file._id}`,
      });
      // return res
      //   .status(200)
      //   .json({
      //     downloadPage: `${process.env.API_URL}/api/files/${Date.now()}`,
      //   });
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong!",
    });
  }
});

/*
 *  @ method  GET
 *  @ route   http://domain/api/files/fileId
 */

router.get("/:fileId", async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.fileId);
    if (!file) {
      return res.status(400).render("download", {
        success: false,
        message: "File link has expired! Please try again.",
      });
    }

    return res.status(200).render("download", {
      success: true,
      fileId: file._id,
      fileName: file.name,
      size: `${file.size / 1000} Kb `,
      downloadLink: `${process.env.API_URL}/api/files/download/${file._id}`,
    });
  } catch (error) {
    return res.status(500).render("download", {
      success: false,
      message: "Something went wrong!",
    });
  }
});

/*
 *  @ method  GET
 *  @ route   http://domain/api/files/download/fileId
 */

router.get("/download/:fileId", async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.fileId);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File link has expired! Please try again.",
      });
    }

    const downloadPath = `${__dirname}/../${file.path}`;
    return res.download(downloadPath);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Something went wrong.",
    });
  }
});

/*
 *  @ method  POST
 *  @ route   http://domain/api/files/sendemail
 */

router.post("/sendemail", async (req, res) => {
  console.log(req.body);
  try {
    const { fileId, emailFrom, emailTo } = req.body;

    if (!fileId || !emailFrom || !emailTo) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (!validator.validate(emailFrom) || !validator.validate(emailTo)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email.",
      });
    }

    const file = await FileModel.findById(fileId);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File link has expired!",
      });
    }

    if (file.sender) {
      return res.status(400).json({
        success: false,
        message: "Email already sent!",
      });
    }

    file.sender = emailFrom;
    file.receiver = emailTo;
    await file.save();

    sendEmail({
      from: emailFrom,
      to: emailTo,
      subject: "FunShare File Sharing",
      test: "Test...",
      html: "<h1>This is a test email</h1>",
    });

    return res.status(200).json({
      success: true,
      message: "Email successfully sent!",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Something went wrong.",
    });
  }
});

module.exports = router;