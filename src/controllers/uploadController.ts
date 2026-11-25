import { Request, Response } from 'express';

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, message: 'Image upload is not configured' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Image file is required.' });
      return;
    }

    const base64Image = req.file.buffer.toString('base64');

    const formData = new FormData();
    formData.append('image', base64Image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const result = (await response.json()) as any;

    if (!response.ok || !result || !result.success || !result.data?.url) {
      const errorMessage = result?.error?.message || 'Failed to upload image to ImgBB.';
      res.status(502).json({ success: false, message: `Image upload failed: ${errorMessage}` });
      return;
    }

    res.status(200).json({
      success: true,
      url: result.data.url,
    });
  } catch (error: any) {
    res.status(502).json({
      success: false,
      message: error.message || 'Image upload service unavailable.',
    });
  }
};
