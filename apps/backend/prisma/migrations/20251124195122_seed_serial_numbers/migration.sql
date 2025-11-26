-- Migration: Seed Task Category Prefixes and Backfill Serial Numbers
-- This migration populates prefix and serialNumber fields for existing data

-- ==============================================================
-- PART 1: Generate and assign prefixes to TaskCategories
-- ==============================================================

-- Function to generate prefix from category name (PostgreSQL)
CREATE OR REPLACE FUNCTION generate_prefix("categoryName" TEXT) 
RETURNS TEXT AS $$
DECLARE
    words TEXT[];
    prefix TEXT;
BEGIN
    -- Remove special characters and split into words
    words := regexp_split_to_array(
        regexp_replace("categoryName", '[^a-zA-Z\s]', '', 'g'),
        '\s+'
    );
    
    -- Remove empty strings
    words := ARRAY(
    SELECT word 
    FROM unnest(words) AS word 
    WHERE word != ''
);
    
    IF array_length(words, 1) = 1 THEN
        -- Single word: take first 2 letters
        prefix := UPPER(SUBSTRING(words[1], 1, 2));
    ELSE
        -- Multiple words: take first letter of each word (max 3)
        prefix := UPPER(SUBSTRING(
            array_to_string(
                ARRAY(SELECT SUBSTRING(w, 1, 1) FROM unnest(words) w),
                ''
            ),
            1, 3
        ));
    END IF;
    
    RETURN prefix;
END;
$$ LANGUAGE plpgsql;

-- Assign prefixes to categories
UPDATE "TaskCategory"
SET
    prefix = generate_prefix ("categoryName")
WHERE
    prefix IS NULL;

-- Handle potential duplicates by adding numeric suffix
DO $$
DECLARE
    cat RECORD;
    new_prefix TEXT;
    counter INT;
BEGIN
    FOR cat IN 
        SELECT id, "categoryName", prefix
        FROM "TaskCategory"
        WHERE prefix IS NOT NULL
    LOOP
        counter := 1;
        new_prefix := cat.prefix;
        
        -- Check for duplicates and increment suffix
        WHILE EXISTS (
            SELECT 1 FROM "TaskCategory" 
            WHERE prefix = new_prefix AND id != cat.id
        ) LOOP
            new_prefix := cat.prefix || counter::TEXT;
            counter := counter + 1;
        END LOOP;
        
        -- Update if we had to change the prefix
        IF new_prefix != cat.prefix THEN
            UPDATE "TaskCategory"
            SET prefix = new_prefix
            WHERE id = cat.id;
        END IF;
    END LOOP;
END $$;

-- ==============================================================
-- PART 2: Create TaskSequence records for each category
-- ==============================================================

INSERT INTO "TaskSequence" (id, prefix, "taskCategoryId", "currentNumber", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::TEXT,
    prefix,
    id,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "TaskCategory"
WHERE prefix IS NOT NULL
ON CONFLICT (prefix) DO NOTHING;

-- ==============================================================
-- PART 3: Backfill serial numbers for existing "Task"
-- ==============================================================

DO $$
DECLARE
    cat RECORD;
    task RECORD;
    counter BIGINT;
    serial_num TEXT;
BEGIN
    -- Process each category
    FOR cat IN 
        SELECT tc.id, tc.prefix, tc."categoryName"
        FROM "TaskCategory" tc
        WHERE tc.prefix IS NOT NULL
        ORDER BY tc."categoryName"
    LOOP
        RAISE NOTICE 'Processing category: % (%)', cat."categoryName", cat.prefix;
        
        counter := 0;
        
        -- Process each task in this category (oldest first)
        FOR task IN
            SELECT t.id
            FROM "Task" t
            WHERE t."taskCategoryId" = cat.id
              AND t."serialNumber" IS NULL
            ORDER BY t."createdAt" ASC
        LOOP
            counter := counter + 1;
            serial_num := cat.prefix || '-' || LPAD(counter::TEXT, 5, '0');
            
            -- Update task with serial number
            UPDATE "Task"
            SET "serialNumber" = serial_num
            WHERE id = task.id;
            
            RAISE NOTICE '  Assigned: %', serial_num;
        END LOOP;
        
        -- Update the TaskSequence counter
        IF counter > 0 THEN
            UPDATE "TaskSequence"
            SET "currentNumber" = counter
            WHERE prefix = cat.prefix;
            
            RAISE NOTICE '  Updated sequence counter to: %', counter;
        END IF;
    END LOOP;
END $$;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS generate_prefix (TEXT);

-- ==============================================================
-- VERIFICATION
-- ==============================================================

-- Log summary
DO $$
DECLARE
    categories_with_prefix INT;
    tasks_with_serial INT;
    tasks_without_serial INT;
BEGIN
    SELECT COUNT(*) INTO categories_with_prefix
    FROM "TaskCategory" WHERE prefix IS NOT NULL;
    
    SELECT COUNT(*) INTO tasks_with_serial
    FROM "Task" WHERE "serialNumber" IS NOT NULL;
    
    SELECT COUNT(*) INTO tasks_without_serial
    FROM "Task" WHERE "serialNumber" IS NULL;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MIGRATION SUMMARY:';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Categories with prefix: %', categories_with_prefix;
    RAISE NOTICE 'Tasks with serial number: %', tasks_with_serial;
    RAISE NOTICE 'Tasks without serial number: %', tasks_without_serial;
    RAISE NOTICE '==============================================';
END $$;