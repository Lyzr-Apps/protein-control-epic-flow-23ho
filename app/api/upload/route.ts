import { NextRequest, NextResponse } from 'next/server'

const LYZR_UPLOAD_URL = 'https://agent-prod.studio.lyzr.ai/v3/assets/upload'
const LYZR_API_KEY = process.env.LYZR_API_KEY || ''

// ── Allowed MIME types ──────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',

  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',

  // Videos
  'video/mp4',
  'video/quicktime',       // .mov
  'video/webm',
  'video/x-msvideo',       // .avi
  'video/x-matroska',      // .mkv
  'video/x-ms-wmv',        // .wmv
  'video/x-flv',           // .flv
  'video/3gpp',            // .3gp
  'video/3gpp2',           // .3g2
  'video/ogg',             // .ogv
  'video/mp2t',            // .ts / .mts
  'video/x-m4v',           // .m4v
  'video/mpeg',            // .mpeg / .mpg
])

// Fallback: also allow by file extension for edge cases where MIME type is generic
const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.tiff', '.tif',
  // Documents
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv',
  // Videos
  '.mp4', '.mov', '.webm', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.3g2',
  '.ogv', '.ts', '.mts', '.m4v', '.mpeg', '.mpg', '.m2ts',
])

// ── Size limits ─────────────────────────────────────────────────────
const MAX_VIDEO_SIZE = 500 * 1024 * 1024   // 500 MB for video files
const MAX_OTHER_SIZE = 50 * 1024 * 1024    // 50 MB for images/documents

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ValidationResult {
  valid: boolean
  error?: string
}

function validateFile(file: File): ValidationResult {
  // Check for empty/corrupted files
  if (!file.size || file.size === 0) {
    return { valid: false, error: `File "${file.name}" is empty or corrupted (0 bytes).` }
  }

  // Check MIME type or extension
  const ext = getFileExtension(file.name)
  const mimeAllowed = ALLOWED_MIME_TYPES.has(file.type)
  const extAllowed = ALLOWED_EXTENSIONS.has(ext)

  // Some browsers send 'application/octet-stream' for video files — fall back to extension
  if (!mimeAllowed && !extAllowed) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported type "${file.type || 'unknown'}" (extension: ${ext || 'none'}). Allowed: images (PNG, JPG, WEBP), documents (PDF, DOCX, PPTX, XLSX, TXT), videos (MP4, MOV, AVI, MKV, WEBM, WMV, FLV, 3GP, OGV, MPEG).`,
    }
  }

  // Check file size based on type
  const isVideo = isVideoMime(file.type) || ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.3g2', '.ogv', '.ts', '.mts', '.m4v', '.mpeg', '.mpg', '.m2ts'].includes(ext)
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_OTHER_SIZE

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File "${file.name}" (${formatSize(file.size)}) exceeds the ${isVideo ? '500 MB video' : '50 MB'} size limit.`,
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    if (!LYZR_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: 0,
          successful_uploads: 0,
          failed_uploads: 0,
          message: 'LYZR_API_KEY not configured',
          timestamp: new Date().toISOString(),
          error: 'LYZR_API_KEY not configured on server',
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files')

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: 0,
          successful_uploads: 0,
          failed_uploads: 0,
          message: 'No files provided',
          timestamp: new Date().toISOString(),
          error: 'No files provided',
        },
        { status: 400 }
      )
    }

    // Validate all files before uploading
    const validFiles: File[] = []
    const validationErrors: string[] = []

    for (const file of files) {
      if (!(file instanceof File)) {
        validationErrors.push('Invalid file entry in form data.')
        continue
      }

      const result = validateFile(file)
      if (result.valid) {
        validFiles.push(file)
      } else {
        validationErrors.push(result.error || `File "${file.name}" failed validation.`)
      }
    }

    // If all files failed validation, return error
    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: files.length,
          successful_uploads: 0,
          failed_uploads: files.length,
          message: 'All files failed validation',
          timestamp: new Date().toISOString(),
          error: validationErrors.join(' '),
        },
        { status: 400 }
      )
    }

    // Forward valid files to Lyzr API
    const uploadFormData = new FormData()
    for (const file of validFiles) {
      uploadFormData.append('files', file, file.name)
    }

    const response = await fetch(LYZR_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'x-api-key': LYZR_API_KEY,
      },
      body: uploadFormData,
    })

    if (response.ok) {
      const data = await response.json()

      const uploadedFiles = (data.results || []).map((r: any) => ({
        asset_id: r.asset_id || '',
        file_name: r.file_name || '',
        success: r.success ?? true,
        error: r.error,
      }))

      const assetIds = uploadedFiles
        .filter((f: any) => f.success && f.asset_id)
        .map((f: any) => f.asset_id)

      return NextResponse.json({
        success: true,
        asset_ids: assetIds,
        files: uploadedFiles,
        total_files: data.total_files || files.length,
        successful_uploads: data.successful_uploads || assetIds.length,
        failed_uploads: (data.failed_uploads || 0) + validationErrors.length,
        message: `Successfully uploaded ${assetIds.length} file(s)${validationErrors.length > 0 ? `. ${validationErrors.length} file(s) rejected: ${validationErrors.join(' ')}` : ''}`,
        timestamp: new Date().toISOString(),
      })
    } else {
      const errorText = await response.text()
      console.error('Upload API error:', response.status, errorText)

      return NextResponse.json(
        {
          success: false,
          asset_ids: [],
          files: [],
          total_files: files.length,
          successful_uploads: 0,
          failed_uploads: files.length,
          message: `Upload failed with status ${response.status}`,
          timestamp: new Date().toISOString(),
          error: errorText,
        },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('File upload error:', error)

    return NextResponse.json(
      {
        success: false,
        asset_ids: [],
        files: [],
        total_files: 0,
        successful_uploads: 0,
        failed_uploads: 0,
        message: 'Server error during upload',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
