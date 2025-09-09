const { default: axios } = require("axios");

const getCompanyListings = async (req, res) => {
  try {
    const response = await axios.get(
      "https://wononomadsbe.vercel.app/api/company/companies"
    );

    if (!response.data) {
      return res.status(200).json([]);
    }

    return res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCompanyListings,
};
