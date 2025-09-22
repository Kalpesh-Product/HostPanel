import TemplateModel from "../../models/website/Templates";
import stream from "stream";
export const createTemplates = async (req, res) => {
  try {
    const { templateName, templateTag } = req.body;

    // Check if template already exists
    const existingTemplate = await TemplateModel.findOne({ templateName });
    if (existingTemplate) {
      return res.status(400).json({ message: "Template already exists!" });
    }
    // Create new template with an empty pages array
    const newTemplate = new TemplateModel({
      templateName,
      templateTag,
      pages: [],
    });

    await newTemplate.save();
    res.json({
      message: "Template created successfully!",
      template: newTemplate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Save Editor Data API
export const saveEditor = async (req, res) => {
  try {
    const { templateName, pageName, components, style, assets } = req.body;

    let template = await TemplateModel.findOne({ templateName });

    if (!template) {
      // If template does not exist, create a new one
      template = new TemplateModel({
        templateName,
        pages: [{ pageName, components, style, assets }],
      });
    } else {
      // Check if the page exists in the template
      const existingPage = template.pages.find(
        (page) => page.pageName === pageName
      );

      if (existingPage) {
        // Update existing page
        existingPage.components = components;
        existingPage.style = style;
        existingPage.assets = assets;
      } else {
        // Add new page
        template.pages.push({ pageName, components, style, assets });
      }
    }

    await template.save();
    res.json({ message: "Page saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Load a specific page from a template
export const loadPage = async (req, res) => {
  try {
    const templateName = decodeURIComponent(req.params.templateName);
    const pageName = decodeURIComponent(req.params.pageName);
    const template = await TemplateModel.findOne({ templateName });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const page = template.pages.find((p) => p.pageName === pageName);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get all templates
export const getTemplates = async (req, res) => {
  try {
    const host = req.hostname;
    const subdomain = host.split(".")[0];
    console.log("subdomain", subdomain);

    const templates = await TemplateModel.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Fetch Pages of a Specific Template
export const getPages = async (req, res) => {
  try {
    const { templateName } = req.params;

    // 🔹 Find the template by name
    const template = await TemplateModel.findOne({ templateName });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // 🔹 Return only the pages (array of objects)
    res.json({ pages: template.pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Delete a page from a template
export const deletePage = async (req, res) => {
  try {
    const { templateName, pageName } = req.params;
    const template = await TemplateModel.findOne({ templateName });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    template.pages = template.pages.filter((p) => p.pageName !== pageName);
    await template.save();

    res.json({ message: "Page deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Delete an entire template
export const deleteTemplate = async (req, res) => {
  try {
    const { templateName } = req.params;
    await TemplateModel.findOneAndDelete({ templateName });

    res.json({ message: "Template deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Add a New Page to a Template
export const addPage = async (req, res) => {
  try {
    const { templateName } = req.params;
    const { pageName } = req.body;

    // 🔹 Check if template exists
    const template = await TemplateModel.findOne({ templateName });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // 🔹 Check if the page already exists in the template
    const existingPage = template.pages.find(
      (page) => page.pageName === pageName
    );
    if (existingPage) {
      return res
        .status(400)
        .json({ message: "Page already exists in this template" });
    }

    // 🔹 Add the new page
    template.pages.push({ pageName, components: [], style: [], assets: [] });
    await template.save();

    res.json({ message: "Page added successfully!", pages: template.pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

