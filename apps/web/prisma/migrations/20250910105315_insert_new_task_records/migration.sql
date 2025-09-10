INSERT INTO
	"TaskStatus" (id, "statusName", "createdAt", "updatedAt")
VALUES
	(gen_random_uuid (), 'REVIEW', NOW (), NOW ()),
	(
		gen_random_uuid (),
		'CONTENT_IN_PROGRESS',
		NOW (),
		NOW ()
	),
	(gen_random_uuid (), 'TESTING', NOW (), NOW ()),
	(gen_random_uuid (), 'BLOCKED', NOW (), NOW ()),
	(gen_random_uuid (), 'ON_HOLD', NOW (), NOW ()),
	(gen_random_uuid (), 'APPROVED', NOW (), NOW ()),
	(gen_random_uuid (), 'REJECTED', NOW (), NOW ()) ON CONFLICT ("statusName") DO NOTHING;

-- Insert new TaskPriority records (now with timestamps)
INSERT INTO
	"TaskPriority" (id, "priorityName", "createdAt", "updatedAt")
VALUES
	(gen_random_uuid (), 'CRITICAL', NOW (), NOW ()),
	(gen_random_uuid (), 'HIGH', NOW (), NOW ()),
	(gen_random_uuid (), 'MEDIUM', NOW (), NOW ()),
	(gen_random_uuid (), 'LOW', NOW (), NOW ()),
	(gen_random_uuid (), 'HOLD', NOW (), NOW ()) ON CONFLICT ("priorityName") DO NOTHING;