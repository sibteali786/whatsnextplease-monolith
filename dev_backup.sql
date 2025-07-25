--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: default
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO "default";

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: default
--

COMMENT ON SCHEMA public IS '';


--
-- Name: CreatorType; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."CreatorType" AS ENUM (
    'USER',
    'CLIENT'
);


ALTER TYPE public."CreatorType" OWNER TO "default";

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'PAID',
    'PENDING',
    'OVERDUE'
);


ALTER TYPE public."InvoiceStatus" OWNER TO "default";

--
-- Name: NotificationDeliveryStatus; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."NotificationDeliveryStatus" AS ENUM (
    'PENDING',
    'DELIVERED',
    'FAILED',
    'PARTIAL'
);


ALTER TYPE public."NotificationDeliveryStatus" OWNER TO "default";

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'UNREAD',
    'READ',
    'ARCHIVED'
);


ALTER TYPE public."NotificationStatus" OWNER TO "default";

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."NotificationType" AS ENUM (
    'TASK_ASSIGNED',
    'TASK_COMPLETED',
    'TASK_MODIFIED',
    'MESSAGE_RECEIVED',
    'SYSTEM_ALERT',
    'PAYMENT_RECEIVED',
    'TASK_CREATED',
    'TASK_OVERDUE',
    'TASK_IN_PROGRESS'
);


ALTER TYPE public."NotificationType" OWNER TO "default";

--
-- Name: Roles; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."Roles" AS ENUM (
    'SUPER_USER',
    'DISTRICT_MANAGER',
    'TERRITORY_MANAGER',
    'ACCOUNT_EXECUTIVE',
    'TASK_SUPERVISOR',
    'TASK_AGENT',
    'CLIENT'
);


ALTER TYPE public."Roles" OWNER TO "default";

--
-- Name: TaskPriorityEnum; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."TaskPriorityEnum" AS ENUM (
    'URGENT',
    'LOW_PRIORITY',
    'NORMAL'
);


ALTER TYPE public."TaskPriorityEnum" OWNER TO "default";

--
-- Name: TaskStatusEnum; Type: TYPE; Schema: public; Owner: default
--

CREATE TYPE public."TaskStatusEnum" AS ENUM (
    'NEW',
    'OVERDUE',
    'IN_PROGRESS',
    'COMPLETED'
);


ALTER TYPE public."TaskStatusEnum" OWNER TO "default";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO "default";

--
-- Name: Client; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    "companyName" text NOT NULL,
    "contactName" text,
    phone text,
    email text NOT NULL,
    website text,
    address1 text,
    address2 text,
    city text,
    state text,
    "zipCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "avatarUrl" text,
    "passwordHash" text NOT NULL,
    "roleId" text,
    username text NOT NULL,
    country text DEFAULT 'US'::text
);


ALTER TABLE public."Client" OWNER TO "default";

--
-- Name: ClientBilling; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."ClientBilling" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "prepaidHours" numeric(5,2) DEFAULT 0.0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClientBilling" OWNER TO "default";

--
-- Name: District; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."District" (
    id text NOT NULL,
    "districtName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."District" OWNER TO "default";

--
-- Name: File; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."File" (
    id text NOT NULL,
    "fileCategoryId" text,
    "ownerUserId" text,
    "ownerClientId" text,
    "fileName" text NOT NULL,
    "filePath" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fileSize" text NOT NULL,
    "uploadedBy" text NOT NULL
);


ALTER TABLE public."File" OWNER TO "default";

--
-- Name: FileCategory; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."FileCategory" (
    id text NOT NULL,
    "categoryName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FileCategory" OWNER TO "default";

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "taskId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public."InvoiceStatus" DEFAULT 'PENDING'::public."InvoiceStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO "default";

--
-- Name: Message; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "senderId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Message" OWNER TO "default";

--
-- Name: MessageParticipant; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."MessageParticipant" (
    "threadId" text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public."MessageParticipant" OWNER TO "default";

--
-- Name: MessageThread; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."MessageThread" (
    id text NOT NULL,
    subject text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MessageThread" OWNER TO "default";

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clientId" text,
    data jsonb,
    status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
    type public."NotificationType" NOT NULL,
    "deliveryError" text,
    "deliveryStatus" public."NotificationDeliveryStatus" DEFAULT 'PENDING'::public."NotificationDeliveryStatus" NOT NULL,
    "lastDeliveryAttempt" timestamp(3) without time zone
);


ALTER TABLE public."Notification" OWNER TO "default";

--
-- Name: Picklist; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Picklist" (
    id text NOT NULL,
    "picklistName" text NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Picklist" OWNER TO "default";

--
-- Name: PushSubscription; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."PushSubscription" (
    id text NOT NULL,
    "userId" text,
    "clientId" text,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PushSubscription" OWNER TO "default";

--
-- Name: Rate; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Rate" (
    id text NOT NULL,
    "taskOfferingId" text NOT NULL,
    "priorityId" text NOT NULL,
    "rateAmount" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Rate" OWNER TO "default";

--
-- Name: Role; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    description text,
    name public."Roles" DEFAULT 'SUPER_USER'::public."Roles" NOT NULL
);


ALTER TABLE public."Role" OWNER TO "default";

--
-- Name: Skill; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Skill" (
    id text NOT NULL,
    "skillCategoryId" text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Skill" OWNER TO "default";

--
-- Name: SkillCategory; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."SkillCategory" (
    id text NOT NULL,
    "categoryName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SkillCategory" OWNER TO "default";

--
-- Name: Task; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    "taskCategoryId" text NOT NULL,
    description text NOT NULL,
    "priorityId" text NOT NULL,
    "statusId" text NOT NULL,
    "assignedToId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    title text NOT NULL,
    "overTime" numeric(10,2),
    "timeForTask" numeric(10,2) NOT NULL,
    "createdByClientId" text,
    "createdByUserId" text,
    "creatorType" public."CreatorType" NOT NULL
);


ALTER TABLE public."Task" OWNER TO "default";

--
-- Name: TaskCategory; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskCategory" (
    id text NOT NULL,
    "categoryName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TaskCategory" OWNER TO "default";

--
-- Name: TaskFile; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskFile" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "fileId" text NOT NULL
);


ALTER TABLE public."TaskFile" OWNER TO "default";

--
-- Name: TaskHistory; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskHistory" (
    id text NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "taskId" text NOT NULL,
    "statusId" text NOT NULL,
    "changedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TaskHistory" OWNER TO "default";

--
-- Name: TaskOffering; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskOffering" (
    id text NOT NULL,
    "taskCategoryId" text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TaskOffering" OWNER TO "default";

--
-- Name: TaskPriority; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskPriority" (
    id text NOT NULL,
    "priorityName" public."TaskPriorityEnum" DEFAULT 'NORMAL'::public."TaskPriorityEnum" NOT NULL
);


ALTER TABLE public."TaskPriority" OWNER TO "default";

--
-- Name: TaskSkill; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskSkill" (
    "taskId" text NOT NULL,
    "skillId" text NOT NULL
);


ALTER TABLE public."TaskSkill" OWNER TO "default";

--
-- Name: TaskStatus; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."TaskStatus" (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "statusName" public."TaskStatusEnum" DEFAULT 'NEW'::public."TaskStatusEnum" NOT NULL
);


ALTER TABLE public."TaskStatus" OWNER TO "default";

--
-- Name: Territory; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."Territory" (
    id text NOT NULL,
    "districtId" text NOT NULL,
    "territoryName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Territory" OWNER TO "default";

--
-- Name: User; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."User" (
    email text NOT NULL,
    address text,
    "avatarUrl" text,
    city text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "passwordHash" text NOT NULL,
    phone text,
    "roleId" text,
    state text,
    "zipCode" text,
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    username text NOT NULL,
    designation text,
    country text
);


ALTER TABLE public."User" OWNER TO "default";

--
-- Name: UserSchedule; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."UserSchedule" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "availableFrom" timestamp(3) without time zone,
    "availableTo" timestamp(3) without time zone,
    "dayOfWeek" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserSchedule" OWNER TO "default";

--
-- Name: UserSkill; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."UserSkill" (
    "userId" text NOT NULL,
    "skillId" text NOT NULL
);


ALTER TABLE public."UserSkill" OWNER TO "default";

--
-- Name: UserTerritory; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public."UserTerritory" (
    "userId" text NOT NULL,
    "territoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserTerritory" OWNER TO "default";

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: default
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO "default";

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."AuditLog" (id, "userId", action, "timestamp") FROM stdin;
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Client" (id, "companyName", "contactName", phone, email, website, address1, address2, city, state, "zipCode", "createdAt", "updatedAt", "avatarUrl", "passwordHash", "roleId", username, country) FROM stdin;
b00f509e-09bd-44d5-9037-eb545a2d0350	Customer Inc	\N	\N	tes@customer.com	\N	\N	\N	\N	\N	\N	2025-04-19 06:43:52.171	2025-04-19 06:43:52.171	\N	$2b$10$IqhiLQ0soHDxVqeZt/MS9.16awtyhP7zhSG5geo6cdvP5TUJFygC2	b2b58ff4-d06a-4222-b975-ad8086d49b75	testcustomer	US
ff899d54-c196-430c-99cb-862280be43e2	ABC Company	\N	\N	john@son.com	\N	\N	\N	\N	\N	\N	2025-07-18 13:48:49.671	2025-07-18 13:48:49.671	\N	$2b$10$l1II7ZOY6/LJA5XeHDQNl.oWr8UPZZ4BBBBeTkeu/8a2HEVjJn0Dq	b2b58ff4-d06a-4222-b975-ad8086d49b75	John123	US
\.


--
-- Data for Name: ClientBilling; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."ClientBilling" (id, "clientId", "prepaidHours", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: District; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."District" (id, "districtName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: File; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."File" (id, "fileCategoryId", "ownerUserId", "ownerClientId", "fileName", "filePath", "uploadedAt", "createdAt", "updatedAt", "fileSize", "uploadedBy") FROM stdin;
6dc5875d-f035-49d4-b289-f5636f7b44c0	\N	\N	\N	Add Skill.png	Add Skill.png	2024-12-06 07:02:16.624	2024-12-06 07:02:16.624	2024-12-06 07:02:16.624	73.596kb	super  user
3d0abd7f-fde7-4f52-ba56-af3b05429c0e	\N	\N	\N	schema.txt	schema.txt	2024-12-06 07:16:30.151	2024-12-06 07:16:30.151	2024-12-06 07:16:30.151	66.373kb	super  user
1f5ba2bd-744d-4aa4-88bd-1bd5750e85f3	\N	\N	\N	schema.txt	schema.txt	2024-12-06 07:17:54.088	2024-12-06 07:17:54.088	2024-12-06 07:17:54.088	66.373kb	super  user
6e01eb8b-774c-4712-ac30-1a3ef9def490	\N	\N	\N	schema.txt	schema.txt	2024-12-06 07:20:25.941	2024-12-06 07:20:25.941	2024-12-06 07:20:25.941	66.373kb	super  user
e867b4ae-8af1-44a0-9fc4-4bad761d4885	\N	\N	\N	Screenshot 2024-12-05 at 11.56.20 AM.png	Screenshot 2024-12-05 at 11.56.20 AM.png	2024-12-11 15:23:59.004	2024-12-11 15:23:58.93	2024-12-11 15:23:59.004	17.225kb	client
8ac4bc81-ab0b-443c-9e43-ad9daab5cbe3	\N	\N	\N	schema.txt	tasks/e9ce7867-e83e-435e-91c4-2d36c4d39be6/users/2493eace-486c-4ab7-aed4-3145d674cd37/schema.txt	2024-12-27 12:09:24.366	2024-12-27 12:09:19.629	2024-12-27 12:09:24.366	66.373kb	client
a81b7130-cc75-4f2d-9bb5-6d018a3025ad	\N	\N	\N	3d-render-books-fly-fall-blue-background.png	3d-render-books-fly-fall-blue-background.png	2024-12-17 06:18:41.429	2024-12-17 06:18:40.298	2024-12-17 06:18:41.429	608.301kb	umer1
83d34214-450e-4c1c-b406-35039631a265	\N	1e852fec-f94e-418e-b593-0f61ab523be7	\N	Transaction.png	tasks/60483076-c530-4227-a80f-3e00601688ad/users/1e852fec-f94e-418e-b593-0f61ab523be7/Transaction.png	2025-07-18 09:48:47.016	2025-07-18 09:48:44.84	2025-07-18 09:48:47.016	545.814kb	Ali Baqar
107a99b1-fc8c-4469-9bc0-2d379a2815e4	\N	1e852fec-f94e-418e-b593-0f61ab523be7	\N	Transaction.png	tasks/60483076-c530-4227-a80f-3e00601688ad/users/1e852fec-f94e-418e-b593-0f61ab523be7/Transaction.png	2025-07-18 09:49:12.31	2025-07-18 09:49:09.988	2025-07-18 09:49:12.31	545.814kb	Ali Baqar
7b512ecd-f86b-48fb-b60b-c8572e1cbcd1	\N	\N	ff899d54-c196-430c-99cb-862280be43e2	Atomicity.png	tasks/d765e33c-2111-4d6f-afaa-f178584c7bfa/users/ff899d54-c196-430c-99cb-862280be43e2/Atomicity.png	2025-07-18 13:53:16.397	2025-07-18 13:53:12.886	2025-07-18 13:53:16.397	250.113kb	John123
dceee6e1-985b-4a49-8c89-814d0c9c2631	\N	\N	ff899d54-c196-430c-99cb-862280be43e2	Transaction.png	tasks/558a12e3-5d38-4abf-b8a8-bf0404e4359d/users/ff899d54-c196-430c-99cb-862280be43e2/Transaction.png	2025-07-18 14:09:52.064	2025-07-18 14:09:46.724	2025-07-18 14:09:52.064	545.814kb	John123
c0b86ba5-03a9-4ade-b737-44c9032242db	\N	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	\N	Sibteali_transparent.png	tasks/0dbda4b6-c93f-435d-b330-e2d5e27c330b/users/d9a1b518-ce51-4c45-bce4-db41acfe7d1e/Sibteali_transparent.png	2025-07-18 14:18:46.698	2025-07-18 14:18:44.48	2025-07-18 14:18:46.698	24.139kb	Salman Abbasi
0553a6b0-8a6e-492d-98cb-6822b5619d2d	\N	b97f62a7-4159-47d4-8da6-1bafcfc2443b	\N	Atomicity.png	users/b97f62a7-4159-47d4-8da6-1bafcfc2443b/uploaded-by/d9a1b518-ce51-4c45-bce4-db41acfe7d1e/Atomicity.png	2025-07-18 14:22:29.296	2025-07-18 14:22:26.38	2025-07-18 14:22:29.296	250.113kb	Salman Abbasi
\.


--
-- Data for Name: FileCategory; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."FileCategory" (id, "categoryName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Invoice" (id, "clientId", "taskId", "invoiceNumber", date, amount, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Message" (id, "threadId", "senderId", content, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MessageParticipant; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."MessageParticipant" ("threadId", "userId") FROM stdin;
\.


--
-- Data for Name: MessageThread; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."MessageThread" (id, subject, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Notification" (id, "userId", message, "createdAt", "updatedAt", "clientId", data, status, type, "deliveryError", "deliveryStatus", "lastDeliveryAttempt") FROM stdin;
f1c667d1-cbdb-4017-b100-04c2084274a1	adec44fa-2552-48eb-8ffb-5cf038027d71	New task "Testing 101" has been created by John123 and needs assignment	2025-07-18 13:53:30.318	2025-07-18 13:53:30.357	\N	{"name": "John123", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 13:53:30.356
afccb94d-466f-4a63-9dba-3af0ce3c9d0a	46e2b7f8-b11a-46ea-b076-5f855f4dd52f	New task "Testing 101" has been created by John123 and needs assignment	2025-07-18 13:53:30.375	2025-07-18 13:53:30.4	\N	{"name": "John123", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 13:53:30.399
8782c625-6905-473c-8d80-8030a0a26735	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task "Testing 101" has been assigned to you by Salman Abbasi	2025-07-18 13:55:10.557	2025-07-18 13:55:10.585	\N	{"name": "Salman Abbasi", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "SalmanAbbasi", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-18 13:55:10.584
d03654ae-d6c1-4fe5-88ce-e0bcc9cb7d95	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	New task "Testing 101" has been created by John123 and needs assignment	2025-07-18 13:53:30.215	2025-07-18 13:55:22.395	\N	{"name": "John123", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	READ	TASK_CREATED	\N	DELIVERED	2025-07-18 13:53:30.243
e772435b-babc-4c99-9d48-68e7156284be	\N	Task "testing the cron job shceduler" assigned to someone is now overdue	2025-05-18 00:00:03.4	2025-05-18 00:00:03.449	\N	{"status": "OVERDUE", "taskId": "785b37ac-6fad-441f-9e38-2b43e4b48981"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-05-18 00:00:03.448
83b4440c-0ddc-413d-8e2b-651bc388a183	\N	Task "testing the cron job shceduler" has been assigned to you by Task SupervisorA	2025-05-06 07:10:56.236	2025-05-06 07:10:56.289	\N	{"name": "Task SupervisorA", "taskId": "785b37ac-6fad-441f-9e38-2b43e4b48981", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "supervisorA", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-05-06 07:10:56.288
5c482040-bef4-465b-b30c-1bbb5f1a9a57	\N	Task testing the cron job shceduler has been created by Task SupervisorA	2025-05-06 07:10:56.958	2025-05-06 07:10:56.991	\N	{"name": "Task SupervisorA", "taskId": "785b37ac-6fad-441f-9e38-2b43e4b48981", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "supervisorA", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-05-06 07:10:56.99
7c02f23e-4c31-4254-8e02-5e4c9f41574d	\N	Task "ad aSD AS" has been assigned to you by Ali Baqar	2025-07-18 09:49:51.845	2025-07-18 09:49:51.89	\N	{"name": "Ali Baqar", "taskId": "60483076-c530-4227-a80f-3e00601688ad", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "AliBaqar", "avatarUrl": "https://d2cccjccu1vd3r.cloudfront.net/users/1e852fec-f94e-418e-b593-0f61ab523be7/profile/sibteali-transparent.png"}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-18 09:49:51.889
8e6d8cdd-2a7f-4777-b3ef-6146f5be9bd6	\N	Task "ad aSD AS" has been assigned to you by Ali Baqar	2025-07-18 09:52:42.264	2025-07-18 09:52:42.283	\N	{"name": "Ali Baqar", "taskId": "60483076-c530-4227-a80f-3e00601688ad", "details": {"status": "COMPLETED", "category": "General Tasks", "priority": "NORMAL"}, "username": "AliBaqar", "avatarUrl": "https://d2cccjccu1vd3r.cloudfront.net/users/1e852fec-f94e-418e-b593-0f61ab523be7/profile/sibteali-transparent.png"}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-18 09:52:42.282
3fa2c667-d8d1-4525-b188-d5bc5f97eab4	\N	Task "testing the cron job shceduler" assigned to someone is now overdue	2025-05-18 00:00:03.461	2025-05-18 00:00:03.484	\N	{"status": "OVERDUE", "taskId": "785b37ac-6fad-441f-9e38-2b43e4b48981"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-05-18 00:00:03.483
444141fd-1281-431f-a15b-571f3cd3b47d	\N	Task "testing the cron job shceduler" assigned to someone is now overdue	2025-05-18 00:00:03.495	2025-05-18 00:00:03.516	\N	{"status": "OVERDUE", "taskId": "785b37ac-6fad-441f-9e38-2b43e4b48981"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-05-18 00:00:03.515
f8eefb97-c703-44e1-a658-f387b9a2b8f3	87450b5f-3b10-4ff9-8a0e-f96c8d681520	New task "Testing 102sd" has been created by John123 and needs assignment	2025-07-18 14:09:58.992	2025-07-18 14:09:59.01	\N	{"name": "John123", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 14:09:59.009
8f206947-d41c-4c1c-b662-252c623d883d	87450b5f-3b10-4ff9-8a0e-f96c8d681520	New task "Testing 101" has been created by John123 and needs assignment	2025-07-18 13:53:30.27	2025-07-18 13:53:30.295	\N	{"name": "John123", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 13:53:30.294
81127bbd-66ec-4dec-aa2e-5c028214e5e1	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	New task "Testing 102sd" has been created by John123 and needs assignment	2025-07-18 14:09:58.942	2025-07-18 14:09:58.969	\N	{"name": "John123", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 14:09:58.968
e8c8535f-1b22-4272-9115-3a88c5a6bffe	adec44fa-2552-48eb-8ffb-5cf038027d71	New task "Testing 102sd" has been created by John123 and needs assignment	2025-07-18 14:09:59.025	2025-07-18 14:09:59.05	\N	{"name": "John123", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 14:09:59.049
c56687dd-fdae-4f5b-a90b-707f16475f23	46e2b7f8-b11a-46ea-b076-5f855f4dd52f	New task "Testing 102sd" has been created by John123 and needs assignment	2025-07-18 14:09:59.065	2025-07-18 14:09:59.082	\N	{"name": "John123", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "John123", "avatarUrl": null}	UNREAD	TASK_CREATED	\N	DELIVERED	2025-07-18 14:09:59.082
6f78d7fa-18c6-41b6-a512-04c316787d42	433dffe7-035e-4654-bffb-44a5af3f438e	Task "Testing 102sd" has been assigned to you by Salman Abbasi	2025-07-18 14:12:08.027	2025-07-18 14:12:08.06	\N	{"name": "Salman Abbasi", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "SalmanAbbasi", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-18 14:12:08.059
afce5b7d-0f9c-40ea-b32d-53c422a9d59f	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task "Develop Header for Wnp" has been assigned to you by Salman Abbasi	2025-07-18 14:18:48.949	2025-07-18 14:18:48.979	\N	{"name": "Salman Abbasi", "taskId": "0dbda4b6-c93f-435d-b330-e2d5e27c330b", "details": {"status": "NEW", "category": "Programming", "priority": "NORMAL"}, "username": "SalmanAbbasi", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-18 14:18:48.978
62342cea-bc35-461e-a95e-02431aae3c99	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task Develop Header for Wnp has been created by Salman Abbasi	2025-07-18 14:18:49.305	2025-07-18 14:18:49.331	\N	{"name": "Salman Abbasi", "taskId": "0dbda4b6-c93f-435d-b330-e2d5e27c330b", "details": {"status": "NEW", "category": "Programming", "priority": "NORMAL"}, "username": "SalmanAbbasi", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-18 14:18:49.33
d0acb4d3-c902-41cf-8780-74031b6e3afa	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task "Testing notification for Sibteali Baqar" has been assigned to you by Salman Abbasi	2025-07-21 10:39:48.387	2025-07-21 10:39:48.827	\N	{"name": "Salman Abbasi", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "SalmanAbbasi", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-21 10:39:48.826
e3288a9b-0a14-4639-acd0-f2ef9e93b96c	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task Testing notification for Sibteali Baqar has been created by Salman Abbasi	2025-07-21 10:39:49.215	2025-07-21 10:39:49.315	\N	{"name": "Salman Abbasi", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61", "details": {"status": "NEW", "category": "General Tasks", "priority": "NORMAL"}, "username": "SalmanAbbasi", "avatarUrl": null}	UNREAD	TASK_ASSIGNED	\N	DELIVERED	2025-07-21 10:39:49.314
93344382-5e15-497b-90dd-d5f22b7d14ec	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task "Testing notification for Sibteali Baqar" is now overdue	2025-07-22 00:00:04.693	2025-07-22 00:00:04.964	\N	{"status": "OVERDUE", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:04.96
5e50073e-d1b8-44d5-8b4e-80a2e45e3394	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	Task "Testing notification for Sibteali Baqar" assigned to Sibteali is now overdue	2025-07-22 00:00:04.977	2025-07-22 00:00:05.104	\N	{"status": "OVERDUE", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.103
bb8087a0-ce7e-4716-b614-4784ad4b6b32	87450b5f-3b10-4ff9-8a0e-f96c8d681520	Task "Testing notification for Sibteali Baqar" assigned to Sibteali is now overdue	2025-07-22 00:00:05.153	2025-07-22 00:00:05.175	\N	{"status": "OVERDUE", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.174
558b1f74-9e69-4130-918b-1e99cadebb05	adec44fa-2552-48eb-8ffb-5cf038027d71	Task "Testing notification for Sibteali Baqar" assigned to Sibteali is now overdue	2025-07-22 00:00:05.191	2025-07-22 00:00:05.219	\N	{"status": "OVERDUE", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.217
b3cfbe4c-5e54-4805-993c-4f93e22917d4	46e2b7f8-b11a-46ea-b076-5f855f4dd52f	Task "Testing notification for Sibteali Baqar" assigned to Sibteali is now overdue	2025-07-22 00:00:05.233	2025-07-22 00:00:05.31	\N	{"status": "OVERDUE", "taskId": "28c5fe15-ff8e-4b71-81aa-6c6efa149d61"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.309
5bb2f30d-1af0-4649-afc6-c0fecdc7e479	433dffe7-035e-4654-bffb-44a5af3f438e	Task "Testing 102sd" is now overdue	2025-07-22 00:00:05.36	2025-07-22 00:00:05.394	\N	{"status": "OVERDUE", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.393
17a73385-7c56-44bc-bf60-4019b362cdd7	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	Task "Testing 102sd" assigned to Umer is now overdue	2025-07-22 00:00:05.417	2025-07-22 00:00:05.543	\N	{"status": "OVERDUE", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.536
b8e4e72c-ee22-4709-b25e-bf212c5536c6	87450b5f-3b10-4ff9-8a0e-f96c8d681520	Task "Testing 102sd" assigned to Umer is now overdue	2025-07-22 00:00:05.629	2025-07-22 00:00:05.714	\N	{"status": "OVERDUE", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.707
8a29200b-97cb-4903-9751-e7a8f08d7478	adec44fa-2552-48eb-8ffb-5cf038027d71	Task "Testing 102sd" assigned to Umer is now overdue	2025-07-22 00:00:05.734	2025-07-22 00:00:05.78	\N	{"status": "OVERDUE", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.779
227f5cc1-c16c-468b-9b1a-47737978df60	46e2b7f8-b11a-46ea-b076-5f855f4dd52f	Task "Testing 102sd" assigned to Umer is now overdue	2025-07-22 00:00:05.811	2025-07-22 00:00:05.845	\N	{"status": "OVERDUE", "taskId": "558a12e3-5d38-4abf-b8a8-bf0404e4359d"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-22 00:00:05.842
6c281905-d459-451e-a573-e4f26aed69fb	b97f62a7-4159-47d4-8da6-1bafcfc2443b	Task "Testing 101" is now overdue	2025-07-24 00:00:02.886	2025-07-24 00:00:03.277	\N	{"status": "OVERDUE", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-24 00:00:03.276
85b13c97-331a-4bed-9c31-776669947244	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	Task "Testing 101" assigned to Sibteali is now overdue	2025-07-24 00:00:03.29	2025-07-24 00:00:03.398	\N	{"status": "OVERDUE", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-24 00:00:03.397
23e27f4e-6878-4258-af4b-19515052d7fe	87450b5f-3b10-4ff9-8a0e-f96c8d681520	Task "Testing 101" assigned to Sibteali is now overdue	2025-07-24 00:00:03.411	2025-07-24 00:00:03.451	\N	{"status": "OVERDUE", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-24 00:00:03.45
e00b7495-e4c8-4fb6-a02b-7a33e2670528	adec44fa-2552-48eb-8ffb-5cf038027d71	Task "Testing 101" assigned to Sibteali is now overdue	2025-07-24 00:00:03.462	2025-07-24 00:00:03.482	\N	{"status": "OVERDUE", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-24 00:00:03.481
f7cf3a60-4243-4764-aee2-0ddd0f485876	46e2b7f8-b11a-46ea-b076-5f855f4dd52f	Task "Testing 101" assigned to Sibteali is now overdue	2025-07-24 00:00:03.492	2025-07-24 00:00:03.512	\N	{"status": "OVERDUE", "taskId": "d765e33c-2111-4d6f-afaa-f178584c7bfa"}	UNREAD	TASK_MODIFIED	\N	DELIVERED	2025-07-24 00:00:03.511
\.


--
-- Data for Name: Picklist; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Picklist" (id, "picklistName", value, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PushSubscription; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."PushSubscription" (id, "userId", "clientId", endpoint, p256dh, auth, "createdAt", "updatedAt") FROM stdin;
956722e2-a05a-48cd-8f16-e9ed0ade6189	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	\N	https://updates.push.services.mozilla.com/wpush/v2/gAAAAABofhimEuxyR6frS-_CwJVvp4tSL-WkbLL3C14Nm1NRGrBhB5ADXNOgG6eEvmXma5TZIHo-JCt0yi2Wxsjz3X6nu-HKrkSQfzON9qO7I0Wp0IGPsrTDcK0kjjTY5lmIpRLy21Fc1rjVgIgvpHppfr34yTlsUyNJwwi6Iy9CsAzXMutvUWw	BINW8Esp0vDc11LOdPFVsL3OWRDHSQTOEVgQGUW07QJ9x3RvXCBrVvyQ_oGeJaejCuIW8AWS4fPKSW105FsCVLM	CSa7vvj7S3LgOyaNYw0x-Q	2025-07-21 10:38:31.857	2025-07-21 10:38:31.857
b1025df6-8f71-4cd8-a187-760a6869984c	b97f62a7-4159-47d4-8da6-1bafcfc2443b	\N	https://updates.push.services.mozilla.com/wpush/v2/gAAAAABofhjGSdkm8Yaexk-2a4nbl8durDdzADoh49Vw1Z7euqjUC2O6p-s05QrJGTVCJXtqK5KOyon3AajZU2qrH1NCNaN4StrQLazIsNP-J54abW3QIOig93eX43fwCfzis-EDqF19eWn6ASzSpkbgnUexYh4ocRsm1mHAVVQyiIRqeQFYk_s	BGOXvcPts5L-Nvn9jT_iZE7zD0OiNFmEo-boCn3l2_NCLcv_dAuuBWFm_QbPhYYp0r5NBSX7RcyXbyWa88qC1Mw	0dgJxaYBhmy7maSjteOVhw	2025-07-21 10:39:04.437	2025-07-21 10:39:04.437
\.


--
-- Data for Name: Rate; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Rate" (id, "taskOfferingId", "priorityId", "rateAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Role" (id, description, name) FROM stdin;
b177552d-070a-4d17-8575-52295512d80a	Has rights to all modules	SUPER_USER
989e5d37-5310-4423-8cd5-baaabba2b0c1	Oversees sales in specific areas	DISTRICT_MANAGER
eeb504e7-d87a-4a00-9d25-05521c7f02ba	Manages a territory	TERRITORY_MANAGER
20c04aae-e22d-4262-89ce-0ed2f301e1d3	Handles client accounts	ACCOUNT_EXECUTIVE
34767011-17d7-4f47-a108-4cd90508e4fb	Performs tasks	TASK_AGENT
8d5009df-dec7-4bc2-9aea-56b32e1d5c10	Manages Tasks	TASK_SUPERVISOR
b2b58ff4-d06a-4222-b975-ad8086d49b75	Requests tasks	CLIENT
\.


--
-- Data for Name: Skill; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Skill" (id, "skillCategoryId", name, description, "createdAt", "updatedAt") FROM stdin;
15e39943-7936-4c16-a0f6-d44ff1ec42a6	39fec49f-f587-4cd7-8acd-12dd49f6794d	Web Engineering	Deals with engineering things in website 	2025-05-06 06:13:55.405	2025-05-06 06:13:55.405
9dd38f62-0f06-412d-8ca9-900f4cb825f8	39fec49f-f587-4cd7-8acd-12dd49f6794d	Data Sceince 	sadn asldn askdn a	2025-07-18 14:19:44.628	2025-07-18 14:19:44.628
dde9035f-52f9-4d51-b4c6-4a7de7aa6444	39fec49f-f587-4cd7-8acd-12dd49f6794d	Machine Learning		2025-07-21 06:31:08.631	2025-07-21 06:31:08.631
\.


--
-- Data for Name: SkillCategory; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."SkillCategory" (id, "categoryName", "createdAt", "updatedAt") FROM stdin;
39fec49f-f587-4cd7-8acd-12dd49f6794d	Programming	2025-05-06 06:13:33.791	2025-05-06 06:13:33.791
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Task" (id, "taskCategoryId", description, "priorityId", "statusId", "assignedToId", "createdAt", "updatedAt", "dueDate", title, "overTime", "timeForTask", "createdByClientId", "createdByUserId", "creatorType") FROM stdin;
785b37ac-6fad-441f-9e38-2b43e4b48981	5fed48a6-6d70-48a2-a10b-480ea4ba3d1d	sadsada	1252482a-6dc2-48a1-9fe5-d49ffcc32956	993b021b-d764-424d-93f2-145035acef12	\N	2025-05-06 07:09:40.44	2025-07-17 10:43:52.968	2025-05-03 19:00:00	testing the cron job shceduler	0.00	8.00	\N	\N	USER
60483076-c530-4227-a80f-3e00601688ad	5fed48a6-6d70-48a2-a10b-480ea4ba3d1d	Adasd aS A a. ASDS SD	1252482a-6dc2-48a1-9fe5-d49ffcc32956	37c68138-3d96-49fa-aeea-22c6d6e21bd0	\N	2025-07-18 09:48:38.144	2025-07-18 09:52:42.204	2025-07-25 19:00:00	ad aSD AS	0.00	56.00	\N	1e852fec-f94e-418e-b593-0f61ab523be7	USER
0dbda4b6-c93f-435d-b330-e2d5e27c330b	bd2772d8-3bdd-47f4-ac5a-87c1f30aeea1	asdb sakdb sakd	1252482a-6dc2-48a1-9fe5-d49ffcc32956	1643eee4-b2ea-4059-a436-40df490501f0	b97f62a7-4159-47d4-8da6-1bafcfc2443b	2025-07-18 14:17:41.126	2025-07-18 14:18:48.867	2025-07-24 19:00:00	Develop Header for Wnp	0.00	115.05	\N	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	USER
28c5fe15-ff8e-4b71-81aa-6c6efa149d61	5fed48a6-6d70-48a2-a10b-480ea4ba3d1d	as asdasd	1252482a-6dc2-48a1-9fe5-d49ffcc32956	993b021b-d764-424d-93f2-145035acef12	b97f62a7-4159-47d4-8da6-1bafcfc2443b	2025-07-21 10:39:19.672	2025-07-22 00:00:04.229	2025-07-21 19:00:00	Testing notification for Sibteali Baqar	0.00	8.00	\N	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	USER
558a12e3-5d38-4abf-b8a8-bf0404e4359d	5fed48a6-6d70-48a2-a10b-480ea4ba3d1d	We are testing as taksa	1252482a-6dc2-48a1-9fe5-d49ffcc32956	993b021b-d764-424d-93f2-145035acef12	433dffe7-035e-4654-bffb-44a5af3f438e	2025-07-18 14:06:53.364	2025-07-22 00:00:05.322	2025-07-21 19:00:00	Testing 102sd	0.00	75.00	ff899d54-c196-430c-99cb-862280be43e2	\N	CLIENT
d765e33c-2111-4d6f-afaa-f178584c7bfa	5fed48a6-6d70-48a2-a10b-480ea4ba3d1d	asd asd asd	1252482a-6dc2-48a1-9fe5-d49ffcc32956	993b021b-d764-424d-93f2-145035acef12	b97f62a7-4159-47d4-8da6-1bafcfc2443b	2025-07-18 13:52:52.024	2025-07-24 00:00:02.525	2025-07-23 19:00:00	Testing 101	0.00	112.00	ff899d54-c196-430c-99cb-862280be43e2	\N	CLIENT
\.


--
-- Data for Name: TaskCategory; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskCategory" (id, "categoryName", "createdAt", "updatedAt") FROM stdin;
5fed48a6-6d70-48a2-a10b-480ea4ba3d1d	General Tasks	2025-04-17 11:11:08.426	2025-04-17 11:11:08.426
bd2772d8-3bdd-47f4-ac5a-87c1f30aeea1	Programming	2025-07-18 14:17:34.182	2025-07-18 14:17:34.182
\.


--
-- Data for Name: TaskFile; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskFile" (id, "taskId", "fileId") FROM stdin;
63da4678-e96e-4297-af89-f660dcd09770	60483076-c530-4227-a80f-3e00601688ad	83d34214-450e-4c1c-b406-35039631a265
094cf2ba-f9b8-492f-b5a1-a434873d9e75	60483076-c530-4227-a80f-3e00601688ad	107a99b1-fc8c-4469-9bc0-2d379a2815e4
3d56d652-f8dc-444f-99ad-874661e36286	d765e33c-2111-4d6f-afaa-f178584c7bfa	7b512ecd-f86b-48fb-b60b-c8572e1cbcd1
83b581cb-082d-47b5-bb0a-7e6292bb3a90	558a12e3-5d38-4abf-b8a8-bf0404e4359d	dceee6e1-985b-4a49-8c89-814d0c9c2631
e636430a-236e-4878-b0f2-7673dcee545e	0dbda4b6-c93f-435d-b330-e2d5e27c330b	c0b86ba5-03a9-4ade-b737-44c9032242db
\.


--
-- Data for Name: TaskHistory; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskHistory" (id, "changedAt", "taskId", "statusId", "changedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TaskOffering; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskOffering" (id, "taskCategoryId", description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TaskPriority; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskPriority" (id, "priorityName") FROM stdin;
baa6d19d-a3ca-4954-99a1-808b9917f479	URGENT
1252482a-6dc2-48a1-9fe5-d49ffcc32956	NORMAL
de754f81-7f18-470e-bade-02cfe3465751	LOW_PRIORITY
\.


--
-- Data for Name: TaskSkill; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskSkill" ("taskId", "skillId") FROM stdin;
785b37ac-6fad-441f-9e38-2b43e4b48981	15e39943-7936-4c16-a0f6-d44ff1ec42a6
60483076-c530-4227-a80f-3e00601688ad	15e39943-7936-4c16-a0f6-d44ff1ec42a6
d765e33c-2111-4d6f-afaa-f178584c7bfa	15e39943-7936-4c16-a0f6-d44ff1ec42a6
558a12e3-5d38-4abf-b8a8-bf0404e4359d	15e39943-7936-4c16-a0f6-d44ff1ec42a6
0dbda4b6-c93f-435d-b330-e2d5e27c330b	15e39943-7936-4c16-a0f6-d44ff1ec42a6
28c5fe15-ff8e-4b71-81aa-6c6efa149d61	9dd38f62-0f06-412d-8ca9-900f4cb825f8
28c5fe15-ff8e-4b71-81aa-6c6efa149d61	dde9035f-52f9-4d51-b4c6-4a7de7aa6444
\.


--
-- Data for Name: TaskStatus; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."TaskStatus" (id, "createdAt", "updatedAt", "statusName") FROM stdin;
1643eee4-b2ea-4059-a436-40df490501f0	2025-04-10 11:15:04.073	2025-04-10 11:15:04.073	NEW
1f53fa4c-a42f-460d-bfc6-4e3aeb5943d2	2025-04-10 11:15:04.605	2025-04-10 11:15:04.605	IN_PROGRESS
37c68138-3d96-49fa-aeea-22c6d6e21bd0	2025-04-10 11:15:04.892	2025-04-10 11:15:04.892	COMPLETED
993b021b-d764-424d-93f2-145035acef12	2025-04-10 11:15:05.201	2025-04-10 11:15:05.201	OVERDUE
\.


--
-- Data for Name: Territory; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."Territory" (id, "districtId", "territoryName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."User" (email, address, "avatarUrl", city, "firstName", "lastName", "passwordHash", phone, "roleId", state, "zipCode", id, "createdAt", "updatedAt", username, designation, country) FROM stdin;
super@alibaqar.com	\N	https://d2cccjccu1vd3r.cloudfront.net/users/1e852fec-f94e-418e-b593-0f61ab523be7/profile/sibteali-transparent.png	Islamabad	Ali	Baqar	$2b$10$yRENmUPxUp1wpC1yHWIvqOCGvU3ATTeJSDx8sJn.UMW8SGTWv615a	+923120230709	b177552d-070a-4d17-8575-52295512d80a	\N	44000	1e852fec-f94e-418e-b593-0f61ab523be7	2025-04-10 11:18:11.979	2025-04-11 11:28:46.272	AliBaqar	Software Engineer Backend	Pakistan
agent@baqar.com	\N	\N	\N	Sibteali	Baqat	$2b$10$cMT8DhHi9nPSUSX.36..XOqMIfN8oC9D.XGzuVx/qxEB/7lR.hC.i	\N	34767011-17d7-4f47-a108-4cd90508e4fb	\N	\N	b97f62a7-4159-47d4-8da6-1bafcfc2443b	2025-07-18 13:36:06.368	2025-07-18 13:36:06.368	AgentAli	\N	\N
kevin@bhover.com	\N	\N	\N	Kevin	Baumhover	$2b$10$rUIXkIKonzvSJtsInrUDG.2rU7.A/u6qA.zVlQiPwio3B7kbJKsN6	\N	b177552d-070a-4d17-8575-52295512d80a	\N	\N	1ca5f800-6081-4482-a353-7a65b8925057	2025-07-18 13:38:52.675	2025-07-18 13:38:52.675	KevinBaumhover	\N	\N
salaman@abbasi.com	\N	\N	\N	Salman	Abbasi	$2b$10$OGbhdvknYNBsUwCeX.HIOu.GdUXfDXt9TtIttZczyQoR5p77aSfli	\N	8d5009df-dec7-4bc2-9aea-56b32e1d5c10	\N	\N	d9a1b518-ce51-4c45-bce4-db41acfe7d1e	2025-07-18 13:41:25.61	2025-07-18 13:41:25.61	SalmanAbbasi	\N	\N
jennifer@lovell.com	\N	\N	\N	Jennifer	Lovell	$2b$10$uDpAv3Gxvyt968kQ19feGOPjPzWFEfDWseNEUokGslWs9SNM7/F0q	\N	8d5009df-dec7-4bc2-9aea-56b32e1d5c10	\N	\N	87450b5f-3b10-4ff9-8a0e-f96c8d681520	2025-07-18 13:43:20.549	2025-07-18 13:43:20.549	JenniferLovell	\N	\N
catie@barber.com	\N	\N	\N	Catie	Barber	$2b$10$./hgtFMo4zrRBDJKnTm1l.59OBQHnI0cg8mt7HjKfsVwQ4rxOlixW	\N	8d5009df-dec7-4bc2-9aea-56b32e1d5c10	\N	\N	adec44fa-2552-48eb-8ffb-5cf038027d71	2025-07-18 13:44:41.872	2025-07-18 13:44:41.872	CatieBarber	\N	\N
umer@sohail.com	\N	\N	\N	Umer	Sohail	$2b$10$kOFFZBfOF0zRfBHzlDvBuuqgcFlvpqlDnMafp/oEiJYTpyGQX5d9a	\N	34767011-17d7-4f47-a108-4cd90508e4fb	\N	\N	433dffe7-035e-4654-bffb-44a5af3f438e	2025-07-18 13:46:07.579	2025-07-18 13:46:07.579	UmerSohail	\N	\N
hamza@ali.com	\N	\N	\N	Hamza	Ali	$2b$10$/hb96v9lh/H0sehtL49nLewAs6OmE/.rcqQtMn36Ekfvuj6PtcgJu	\N	8d5009df-dec7-4bc2-9aea-56b32e1d5c10	\N	\N	46e2b7f8-b11a-46ea-b076-5f855f4dd52f	2025-07-18 13:46:50.429	2025-07-18 13:46:50.429	HamzaAli	\N	\N
daniyalraza1212@gmail.com	\N	\N	\N	Daniyal	Raza	$2b$10$X6.fz9a6vBeJdDY5kCYdZOhPHrIBOx98xNtdntCc4xuipge2qp9rC	\N	b177552d-070a-4d17-8575-52295512d80a	\N	\N	f8b3dbb7-80a5-4a93-8e24-4c423ff70a80	2025-07-23 08:31:57.996	2025-07-23 08:31:57.996	daniyalraza1212@gmail.com	\N	\N
\.


--
-- Data for Name: UserSchedule; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."UserSchedule" (id, "userId", "availableFrom", "availableTo", "dayOfWeek", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: UserSkill; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."UserSkill" ("userId", "skillId") FROM stdin;
\.


--
-- Data for Name: UserTerritory; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public."UserTerritory" ("userId", "territoryId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: default
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
80d32664-dd00-4d8c-9ae2-a1c2862f3ac0	51ab36a62cf7e82e4c74f79a35be49cfc4a406d8fbf73469f037568c69a3282c	2024-12-02 15:00:01.381971+00	20241202145958_role_name_enum	\N	\N	2024-12-02 14:59:59.995945+00	1
b2b7dc1b-34c3-4c16-ac21-df2b27ed0b40	28c883d35d8a312d4c13e9ce49f04cc77ccc39e6f6b67214e77480ba998022ec	2024-12-02 14:58:36.124016+00	20241011172833_init	\N	\N	2024-12-02 14:58:34.387196+00	1
3251f9b6-c958-4474-8a20-88c7f42b98a7	9b3ab4f24457d89b7ed3403fb368f0555b4e53bf3bf5d8d1c7985c42f19826f0	2024-12-02 14:59:04.8684+00	20241101193655_add_cascade_to_taskskill	\N	\N	2024-12-02 14:59:03.447949+00	1
b1879c34-6655-4050-ad85-8a4847429f42	4a6ad3cfb0d335ba5c8f088e871a7d42ae373f459d568b4d60b14de2c4517124	2024-12-02 14:58:38.380557+00	20241015114319_init	\N	\N	2024-12-02 14:58:36.748458+00	1
a867d463-72a3-4ad5-8fa7-97899d00a7bf	980df28b7ea04865d6615c32e0342b9b31c868d6f61152878dead22d9e026062	2024-12-02 14:58:40.729551+00	20241015160915_priamry_key_type	\N	\N	2024-12-02 14:58:38.995073+00	1
62439966-e24e-4869-b2ad-19acb2480d6d	1e10c3f1ee7ad7aa430ec338b61330ff9c0dd734c2545bca51efa50a16d49e50	2024-12-02 14:58:43.083715+00	20241015172445_create_update	\N	\N	2024-12-02 14:58:41.346316+00	1
94402652-1b05-4c8c-b512-8e1c8a4711da	cac2c05c6682224645fc3815cbaa8c0633fe9be5b761894e68d56e530cebfc88	2024-12-02 14:59:06.926221+00	20241106175010_tasks_title_added	\N	\N	2024-12-02 14:59:05.331077+00	1
4c181825-babe-40bc-aa72-caa4957938e4	e015cc61ecd62c6953b3fc998b649ff1fcb8ad92b08f38c8780a0931f322990e	2024-12-02 14:58:45.232919+00	20241024182113_invoice_billing	\N	\N	2024-12-02 14:58:43.907757+00	1
626c367f-73f2-45a6-b338-a5f8656ca84d	d1426487120adda532a3c1ed68d113614db7f2484a93ad62c06ea9bfeffa0e7b	2024-12-02 14:58:47.483637+00	20241024184047_add_cascade_delete	\N	\N	2024-12-02 14:58:45.904528+00	1
14585b2a-d971-4bde-ae44-dc08dc39b99e	1d3767bf031b7557e2bba4c49ea9c9fd47f1367c7a79d908107708265c5cb5e4	2024-12-02 14:58:49.850065+00	20241025181817_status_name_to_enum	\N	\N	2024-12-02 14:58:48.100002+00	1
a97d853c-65db-488e-b112-b6891bf48e91	b5196723ee7b28ea3f1bfdbbb5ab05bc4df9ab78305d578117d57eb98cab95bb	2024-12-02 14:59:08.870889+00	20241118073151_client_password	\N	\N	2024-12-02 14:59:07.540795+00	1
9f72ee29-3c11-4c79-88ee-a21821e6ffb4	e6124819ddce7f10ccaae9f6ed9b74b7c908acb636aac59f08c0147938d183cb	2024-12-02 14:58:51.781759+00	20241025183351_invoice_task_cascade	\N	\N	2024-12-02 14:58:50.283412+00	1
9446cfa0-2150-4dfa-ad63-dd995ee008e2	1eb75d1bc4282cd5d9a6f044e0b9a43c0992ae69b596d55070c780c3f4f5b14c	2024-12-02 14:58:53.535643+00	20241027105916_file_model_modifications	\N	\N	2024-12-02 14:58:52.347311+00	1
981e4400-e774-493f-be0b-d218803b607c	2aeac05809452e2da5182fd5321b7c024c7a3325201ef97bb87fdeeb8b83e30b	2025-01-16 11:28:54.685818+00	20250101115223_notification_update	\N	\N	2025-01-16 11:28:53.20504+00	1
29f5b43c-a73f-4f6e-b4ad-4c7694a119ad	74f5212bad39f73cad6b0d6ec9f2317f46a16ae6e026ff15c37ac5784dc258d9	2024-12-02 14:58:55.474858+00	20241029095029_file_size_file	\N	\N	2024-12-02 14:58:53.96995+00	1
07ccccb8-3af1-44f4-9b94-efe4ef3e1ef4	230c08c868d3ae96d45df06774dfd25cfd4b208937c2f037ced6646191c9d18a	2024-12-02 14:59:11.225003+00	20241120071326_schema_changes	\N	\N	2024-12-02 14:59:09.588735+00	1
6f6f3b36-a05f-4cef-a344-58fe4376e13e	1d87af8e7069be1c767ed77a0a98b1b930fffe3c353a532d302af74f0d65c40f	2024-12-02 14:58:57.992509+00	20241029152008_avatar_url_client	\N	\N	2024-12-02 14:58:56.285388+00	1
9a7c3c54-1b21-4e1c-a480-cbb4d21fb4fa	37d9e1baa497dc8bef25e20fbfe6548c07e007bcc4e2a3d4edc85ac278552134	2024-12-02 14:59:00.070043+00	20241029202807_designation_user	\N	\N	2024-12-02 14:58:58.426143+00	1
3a0a7745-3487-44d6-8a4f-745d79c26588	3558399d9b181b1be4a1894f63ae21faa5f361bf65c7b94e2de4fd139bec236e	2024-12-02 14:59:02.427155+00	20241101154607_task_skill_relation	\N	\N	2024-12-02 14:59:00.890087+00	1
13b73855-5134-4b63-a6da-c1f1e5cce1c8	ae368a848cee1e6cffef05c267874e06cee370fa3a51c50da76888b7a671ffb7	2024-12-02 14:59:13.276662+00	20241125061412_task_priority_enum	\N	\N	2024-12-02 14:59:11.848142+00	1
73f6375c-d4f1-4961-8a5a-6bb1e3aae37c	bdc6c9ac6a382ba7ff0b0584afd2784023e1444ec3a345feac6125a417dd45e6	2024-12-02 14:59:15.629296+00	20241128104401_add_created_by_type_to_task	\N	\N	2024-12-02 14:59:13.992664+00	1
a8b8c8d9-a848-4b11-8ae2-8c5b6b5d7862	2152f46b54579114fa2d026ace68998ebcfb4575a43d37840fcab969f3ce105d	2025-01-29 11:38:58.454352+00	20250127103250_country_user_client	\N	\N	2025-01-29 11:38:58.4161+00	1
fc1277d0-63c7-4af8-8382-c29cdd8c8377	7e7f68c746fc04cbc40695174c3c6f4bf260c9648c6c884ba30be4f40d58843d	2024-12-02 14:59:17.878825+00	20241128134353_task_created_by	\N	\N	2024-12-02 14:59:16.24488+00	1
f249c761-77f8-4129-aeb5-698115a7ae17	a71dd2a08e0343914a385dd9d23fa8cb7ebc794a05115134deb8e4025ef180ef	2024-12-02 14:59:19.922584+00	20241202144651_role_name_enum	\N	\N	2024-12-02 14:59:18.491388+00	1
9eac1f67-7480-421e-8434-9d2036c2853b	b663055e3b81d9b38179bc41674c826ef2b612cf6618e25f5061de8b3cb8702a	2025-02-13 18:56:15.608274+00	20250213105332_add_push_subscription	\N	\N	2025-02-13 18:56:15.215759+00	1
396a6641-643c-41d8-8dc4-01253e583f8f	9b8c0e4799e61aa868bb066179807a96f785ee9930368d03b634d3891b14b80f	2025-02-27 11:40:00.125995+00	20250225043532_notification_status	\N	\N	2025-02-27 11:40:00.051154+00	1
ff24f9a6-a3ab-478e-873b-2121ec1e0ab8	bda3a4ff51e199a21879bef849f8a0f6c2a14ed07af15c6fde5d62ae28214323	2025-04-22 13:59:25.531367+00	20250422123057_add_task_created_to_notification_type	\N	\N	2025-04-22 13:59:25.293367+00	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: ClientBilling ClientBilling_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."ClientBilling"
    ADD CONSTRAINT "ClientBilling_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: District District_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."District"
    ADD CONSTRAINT "District_pkey" PRIMARY KEY (id);


--
-- Name: FileCategory FileCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."FileCategory"
    ADD CONSTRAINT "FileCategory_pkey" PRIMARY KEY (id);


--
-- Name: File File_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."File"
    ADD CONSTRAINT "File_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: MessageParticipant MessageParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."MessageParticipant"
    ADD CONSTRAINT "MessageParticipant_pkey" PRIMARY KEY ("threadId", "userId");


--
-- Name: MessageThread MessageThread_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."MessageThread"
    ADD CONSTRAINT "MessageThread_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Picklist Picklist_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Picklist"
    ADD CONSTRAINT "Picklist_pkey" PRIMARY KEY (id);


--
-- Name: PushSubscription PushSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_pkey" PRIMARY KEY (id);


--
-- Name: Rate Rate_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Rate"
    ADD CONSTRAINT "Rate_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SkillCategory SkillCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."SkillCategory"
    ADD CONSTRAINT "SkillCategory_pkey" PRIMARY KEY (id);


--
-- Name: Skill Skill_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_pkey" PRIMARY KEY (id);


--
-- Name: TaskCategory TaskCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskCategory"
    ADD CONSTRAINT "TaskCategory_pkey" PRIMARY KEY (id);


--
-- Name: TaskFile TaskFile_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskFile"
    ADD CONSTRAINT "TaskFile_pkey" PRIMARY KEY (id);


--
-- Name: TaskHistory TaskHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskHistory"
    ADD CONSTRAINT "TaskHistory_pkey" PRIMARY KEY (id);


--
-- Name: TaskOffering TaskOffering_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskOffering"
    ADD CONSTRAINT "TaskOffering_pkey" PRIMARY KEY (id);


--
-- Name: TaskPriority TaskPriority_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskPriority"
    ADD CONSTRAINT "TaskPriority_pkey" PRIMARY KEY (id);


--
-- Name: TaskSkill TaskSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskSkill"
    ADD CONSTRAINT "TaskSkill_pkey" PRIMARY KEY ("taskId", "skillId");


--
-- Name: TaskStatus TaskStatus_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskStatus"
    ADD CONSTRAINT "TaskStatus_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: Territory Territory_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Territory"
    ADD CONSTRAINT "Territory_pkey" PRIMARY KEY (id);


--
-- Name: UserSchedule UserSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserSchedule"
    ADD CONSTRAINT "UserSchedule_pkey" PRIMARY KEY (id);


--
-- Name: UserSkill UserSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserSkill"
    ADD CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("userId", "skillId");


--
-- Name: UserTerritory UserTerritory_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserTerritory"
    ADD CONSTRAINT "UserTerritory_pkey" PRIMARY KEY ("userId", "territoryId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ClientBilling_clientId_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "ClientBilling_clientId_key" ON public."ClientBilling" USING btree ("clientId");


--
-- Name: Client_email_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "Client_email_key" ON public."Client" USING btree (email);


--
-- Name: Client_username_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "Client_username_key" ON public."Client" USING btree (username);


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree ("invoiceNumber");


--
-- Name: Notification_clientId_status_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX "Notification_clientId_status_idx" ON public."Notification" USING btree ("clientId", status);


--
-- Name: Notification_userId_status_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX "Notification_userId_status_idx" ON public."Notification" USING btree ("userId", status);


--
-- Name: PushSubscription_clientId_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX "PushSubscription_clientId_idx" ON public."PushSubscription" USING btree ("clientId");


--
-- Name: PushSubscription_endpoint_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON public."PushSubscription" USING btree (endpoint);


--
-- Name: PushSubscription_userId_idx; Type: INDEX; Schema: public; Owner: default
--

CREATE INDEX "PushSubscription_userId_idx" ON public."PushSubscription" USING btree ("userId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: TaskFile_taskId_fileId_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "TaskFile_taskId_fileId_key" ON public."TaskFile" USING btree ("taskId", "fileId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: default
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClientBilling ClientBilling_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."ClientBilling"
    ADD CONSTRAINT "ClientBilling_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Client Client_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: File File_fileCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."File"
    ADD CONSTRAINT "File_fileCategoryId_fkey" FOREIGN KEY ("fileCategoryId") REFERENCES public."FileCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: File File_ownerClientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."File"
    ADD CONSTRAINT "File_ownerClientId_fkey" FOREIGN KEY ("ownerClientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: File File_ownerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."File"
    ADD CONSTRAINT "File_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageParticipant MessageParticipant_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."MessageParticipant"
    ADD CONSTRAINT "MessageParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public."MessageThread"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageParticipant MessageParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."MessageParticipant"
    ADD CONSTRAINT "MessageParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public."MessageThread"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PushSubscription PushSubscription_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PushSubscription PushSubscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Rate Rate_priorityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Rate"
    ADD CONSTRAINT "Rate_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES public."TaskPriority"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rate Rate_taskOfferingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Rate"
    ADD CONSTRAINT "Rate_taskOfferingId_fkey" FOREIGN KEY ("taskOfferingId") REFERENCES public."TaskOffering"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Skill Skill_skillCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES public."SkillCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskFile TaskFile_fileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskFile"
    ADD CONSTRAINT "TaskFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES public."File"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskFile TaskFile_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskFile"
    ADD CONSTRAINT "TaskFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskHistory TaskHistory_changedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskHistory"
    ADD CONSTRAINT "TaskHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskHistory TaskHistory_statusId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskHistory"
    ADD CONSTRAINT "TaskHistory_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES public."TaskStatus"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskHistory TaskHistory_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskHistory"
    ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskOffering TaskOffering_taskCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskOffering"
    ADD CONSTRAINT "TaskOffering_taskCategoryId_fkey" FOREIGN KEY ("taskCategoryId") REFERENCES public."TaskCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskSkill TaskSkill_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskSkill"
    ADD CONSTRAINT "TaskSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskSkill TaskSkill_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."TaskSkill"
    ADD CONSTRAINT "TaskSkill_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_createdByClientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_createdByClientId_fkey" FOREIGN KEY ("createdByClientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_priorityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES public."TaskPriority"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Task Task_statusId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES public."TaskStatus"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Task Task_taskCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_taskCategoryId_fkey" FOREIGN KEY ("taskCategoryId") REFERENCES public."TaskCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Territory Territory_districtId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."Territory"
    ADD CONSTRAINT "Territory_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES public."District"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserSchedule UserSchedule_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserSchedule"
    ADD CONSTRAINT "UserSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserSkill UserSkill_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserSkill"
    ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserSkill UserSkill_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserSkill"
    ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserTerritory UserTerritory_territoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserTerritory"
    ADD CONSTRAINT "UserTerritory_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES public."Territory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserTerritory UserTerritory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."UserTerritory"
    ADD CONSTRAINT "UserTerritory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: default
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: default
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

