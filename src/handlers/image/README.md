# Image Command Handler

This handler processes the `!image` command which allows users to upload and save images to the server.

## Usage

Users can upload images by sending a message with the `!image` command and attaching one or more image files:

```
!image
```

Then attach an image file to the message.

## Functionality

- **Command**: `!image`
- **File Storage**: Images are saved to the `uploads/` directory
- **File Naming**: Images are saved with the Discord user ID as the filename (e.g., `123456789012345678.jpg`)
- **Supported Formats**: All common image formats (JPEG, PNG, GIF, WebP, BMP, SVG)
- **Multiple Files**: Users can upload multiple images in a single message

## File Structure

- Images are saved to: `uploads/{userId}.{extension}`
- The file extension is determined from the original filename or MIME type
- If multiple images are uploaded, only the last one will be kept (previous ones are overwritten)

## Error Handling

The handler provides user-friendly error messages for:
- No attachments provided
- Non-image files uploaded
- File system errors during saving

## Security Considerations

- Only image files are accepted (checked via MIME type)
- Files are saved with sanitized names (user ID only)
- No arbitrary file paths or names are allowed

## Technical Details

- Implements `MessageCreateHandler` interface
- Uses Node.js built-in `fs` module for file operations
- Downloads images via fetch API and saves as Buffer
- Automatic directory creation if `uploads/` doesn't exist
- Comprehensive logging for debugging and monitoring