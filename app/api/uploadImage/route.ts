import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises"
import path from "path";

export async function POST(req: NextRequest) {
    const data = await req.formData();
    const file: any = data.get("file");

    if (!file) {
        return NextResponse.json({ message: "No Image Found", success: false });
    }

    const byteData = await file.arrayBuffer();
    const buffer = Buffer.from(byteData);
    const uploadDir = path.resolve(process.cwd(), 'public', 'users');
    const filePath = path.join(uploadDir, file.name);

    try {
        // Ensure the directory exists
        await mkdir(uploadDir, { recursive: true });

        // Write the file
        await writeFile(filePath, buffer);
        return NextResponse.json({ message: "File Uploaded", success: true });
    } catch (error) {
        console.error("File upload error:", error);
        return NextResponse.json({ message: "File Upload Failed", success: false });
    }
}