# API Testing Examples

## Test Storage Service APIs

### 1. Health Check
```bash
curl http://localhost:3000/api/storage/health
```

### 2. Upload Image (với project name)
```bash
# Upload ảnh vào project "ecommerce"
curl -X POST \
  'http://localhost:3000/api/storage/upload?projectName=ecommerce' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@path/to/your/image.jpg'
```

### 3. Upload Image với folder
```bash
# Upload ảnh vào project "ecommerce", folder "products"
curl -X POST \
  'http://localhost:3000/api/storage/upload?projectName=ecommerce&folder=products' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@path/to/your/image.jpg'
```

### 4. Get Image (sau khi upload thành công)
```bash
# Truy xuất ảnh từ response filePath
curl http://localhost:3000/api/storage/files/ecommerce/uuid-filename.jpg

# Hoặc ảnh trong folder
curl http://localhost:3000/api/storage/files/ecommerce/products/uuid-filename.jpg
```

### 5. List Files trong project
```bash
# List tất cả files trong project
curl http://localhost:3000/api/storage/projects/ecommerce/files

# List files trong folder cụ thể
curl 'http://localhost:3000/api/storage/projects/ecommerce/files?folder=products'
```

### 6. Delete Image
```bash
# Xóa ảnh ở root project
curl -X DELETE http://localhost:3000/api/storage/files/ecommerce/uuid-filename.jpg

# Xóa ảnh trong folder
curl -X DELETE 'http://localhost:3000/api/storage/files/ecommerce/uuid-filename.jpg?folder=products'
```

## Frontend Integration Example

### HTML Form
```html
<!DOCTYPE html>
<html>
<head>
    <title>Image Upload Test</title>
</head>
<body>
    <form id="uploadForm">
        <input type="file" id="fileInput" accept="image/*" required>
        <input type="text" id="projectName" placeholder="Project Name" value="test-project" required>
        <input type="text" id="folder" placeholder="Folder (optional)">
        <button type="submit">Upload</button>
    </form>

    <div id="result"></div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const file = document.getElementById('fileInput').files[0];
            const projectName = document.getElementById('projectName').value;
            const folder = document.getElementById('folder').value;
            
            formData.append('file', file);
            
            let url = `http://localhost:3000/api/storage/upload?projectName=${projectName}`;
            if (folder) {
                url += `&folder=${folder}`;
            }
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                document.getElementById('result').innerHTML = `
                    <h3>Upload Result:</h3>
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                    <img src="http://localhost:3000${result.filePath}" style="max-width: 300px;">
                `;
            } catch (error) {
                document.getElementById('result').innerHTML = `Error: ${error.message}`;
            }
        });
    </script>
</body>
</html>
```

## Postman Collection

1. **Upload Image**
   - Method: POST
   - URL: `http://localhost:3000/api/storage/upload?projectName=test&folder=images`
   - Body: form-data, key: "file", type: File

2. **Get Image**
   - Method: GET
   - URL: `http://localhost:3000/api/storage/files/test/images/{filename}`

3. **List Files**
   - Method: GET
   - URL: `http://localhost:3000/api/storage/projects/test/files?folder=images`
