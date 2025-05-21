require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');

const app = express();
app.use(cors());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Recursive function to get all folders
async function getAllFoldersRecursively(path = '') {
  let folders = [];
  try {
    const result = path === ''
      ? await cloudinary.api.root_folders()
      : await cloudinary.api.sub_folders(path);

    for (const folder of result.folders) {
      const fullPath = path ? `${path}/${folder.name}` : folder.name;
      folders.push(fullPath);
      const subFolders = await getAllFoldersRecursively(fullPath);
      folders = folders.concat(subFolders);
    }
  } catch (err) {
    console.error(`Failed to list subfolders of ${path}:`, err.message);
  }
  return folders;
}

// Fetch images from a single folder (max 30 each for demo)
async function getImagesFromFolder(folderPrefix) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPrefix ? folderPrefix + '/' : '', // add trailing slash if prefix exists
      max_results: 30
    });
    return result.resources.map(img => img.secure_url);
  } catch (error) {
    console.error(`Failed to fetch images from folder "${folderPrefix}":`, error.message);
    return [];
  }
}

// Helper to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

app.get('/images', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;

  try {
    const allFolders = await getAllFoldersRecursively();
    allFolders.unshift(''); // include root folder

    let allImages = [];
    for (const folder of allFolders) {
      const imgs = await getImagesFromFolder(folder);
      allImages = allImages.concat(imgs);
    }

    // Shuffle image URLs randomly
    const shuffledImages = shuffleArray(allImages);

    // Pagination on shuffled images
    const start = (page - 1) * limit;
    const pagedImages = shuffledImages.slice(start, start + limit);

    res.json(pagedImages);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
