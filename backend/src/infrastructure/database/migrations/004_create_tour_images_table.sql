-- Migration: Create tour_images table
-- Description: Table for storing tour images with variants and metadata
-- Created: 2024-01-XX

-- Create tour_images table
CREATE TABLE IF NOT EXISTS tour_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tour relationship
    tour_id VARCHAR(255) NOT NULL,

    -- File information
    key VARCHAR(1000) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,

    -- Image dimensions
    width INTEGER,
    height INTEGER,

    -- Display properties
    is_main BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    alt_text TEXT,

    -- Image variants (JSON)
    variants JSONB,

    -- Metadata
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT tour_images_tour_id_fkey
        FOREIGN KEY (tour_id) REFERENCES virtual_routes(id)
        ON DELETE CASCADE,

    CONSTRAINT tour_images_file_size_positive
        CHECK (file_size > 0),

    CONSTRAINT tour_images_width_positive
        CHECK (width IS NULL OR width > 0),

    CONSTRAINT tour_images_height_positive
        CHECK (height IS NULL OR height > 0),

    CONSTRAINT tour_images_sort_order_non_negative
        CHECK (sort_order >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tour_images_tour_id ON tour_images(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_images_is_main ON tour_images(is_main);
CREATE INDEX IF NOT EXISTS idx_tour_images_sort_order ON tour_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_tour_images_created_at ON tour_images(created_at);
CREATE INDEX IF NOT EXISTS idx_tour_images_key ON tour_images(key);

-- Create unique constraint for main image per tour
CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_images_unique_main
    ON tour_images(tour_id)
    WHERE is_main = TRUE;

-- Add comments for documentation
COMMENT ON TABLE tour_images IS 'Stores tour images with variants and metadata';
COMMENT ON COLUMN tour_images.id IS 'Unique identifier for the tour image';
COMMENT ON COLUMN tour_images.tour_id IS 'Reference to the tour this image belongs to';
COMMENT ON COLUMN tour_images.key IS 'Storage key/path for the image';
COMMENT ON COLUMN tour_images.url IS 'Public URL for accessing the image';
COMMENT ON COLUMN tour_images.filename IS 'Original filename from upload';
COMMENT ON COLUMN tour_images.mime_type IS 'MIME type of the image file';
COMMENT ON COLUMN tour_images.file_size IS 'File size in bytes';
COMMENT ON COLUMN tour_images.width IS 'Image width in pixels';
COMMENT ON COLUMN tour_images.height IS 'Image height in pixels';
COMMENT ON COLUMN tour_images.is_main IS 'Whether this is the main image for the tour';
COMMENT ON COLUMN tour_images.sort_order IS 'Display order for images';
COMMENT ON COLUMN tour_images.alt_text IS 'Alternative text for accessibility';
COMMENT ON COLUMN tour_images.variants IS 'JSON object containing image variants (thumbnail, optimized)';
COMMENT ON COLUMN tour_images.uploaded_by IS 'User ID who uploaded the image';
COMMENT ON COLUMN tour_images.created_at IS 'When the image was created';
COMMENT ON COLUMN tour_images.updated_at IS 'When the image was last updated';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tour_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
CREATE TRIGGER tour_images_updated_at_trigger
    BEFORE UPDATE ON tour_images
    FOR EACH ROW
    EXECUTE FUNCTION update_tour_images_updated_at();

-- Function to get main image for a tour
CREATE OR REPLACE FUNCTION get_tour_main_image(p_tour_id VARCHAR(255))
RETURNS TABLE (
    id UUID,
    key VARCHAR(1000),
    url VARCHAR(2000),
    filename VARCHAR(500),
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    variants JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ti.id,
        ti.key,
        ti.url,
        ti.filename,
        ti.mime_type,
        ti.file_size,
        ti.width,
        ti.height,
        ti.alt_text,
        ti.variants
    FROM tour_images ti
    WHERE ti.tour_id = p_tour_id
    AND ti.is_main = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get all images for a tour
CREATE OR REPLACE FUNCTION get_tour_images(p_tour_id VARCHAR(255), p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    key VARCHAR(1000),
    url VARCHAR(2000),
    filename VARCHAR(500),
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    is_main BOOLEAN,
    sort_order INTEGER,
    alt_text TEXT,
    variants JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ti.id,
        ti.key,
        ti.url,
        ti.filename,
        ti.mime_type,
        ti.file_size,
        ti.width,
        ti.height,
        ti.is_main,
        ti.sort_order,
        ti.alt_text,
        ti.variants,
        ti.created_at
    FROM tour_images ti
    WHERE ti.tour_id = p_tour_id
    ORDER BY ti.is_main DESC, ti.sort_order ASC, ti.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;