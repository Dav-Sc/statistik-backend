-- -- ORDER OF OPERATIONS!!!
-- 	-- Populate clientMaster (input clientName, clientID will auto generate)
-- 	-- Populate tikTokMaster (streamID auto generates, input clientID & stream date)
-- 	-- Populate tikTokRawData & tikTokManualEntry
-- 	-- Populate tikTokCalculatedMetrics



CREATE TABLE IF NOT EXISTS clientMaster (
	clientID INT GENERATED ALWAYS AS IDENTITY,
	clientName VARCHAR(40),

	PRIMARY KEY(clientID)
);

CREATE TABLE IF NOT EXISTS tikTokMaster (
	streamID INT GENERATED ALWAYS AS IDENTITY,
	clientID INT,
	date DATE UNIQUE,

	PRIMARY KEY(streamID),
	CONSTRAINT fk_tikTokMaster FOREIGN KEY (clientID) REFERENCES clientMaster (clientID)
);

CREATE TABLE IF NOT EXISTS tikTokRawData (
	date date UNIQUE,
	totalViews int,
	uniqueViewers int,
	avgWatchTime int, -- in seconds
	topViewerCount int,
	newFollowers int,
	viewersWhoCommented int,
	likes int,
	shares int,
	diamonds int,
	gifters int,
	liveDuration int, -- in seconds

	PRIMARY KEY(date),
	CONSTRAINT fk_tikTokRawData FOREIGN KEY (date) REFERENCES tikTokMaster(date)
);

CREATE TABLE IF NOT EXISTS tikTokManualEntry (
	date date UNIQUE,
	startTime time,
	avgViewerCount int,
	followersWatchedLive float,
	followersSentGifts float,
	followersCommented float,
	followersAvgWatchTime double precision,
	othersAvgWatchTime double precision,
	viewsFromSuggestedLiveVideos float,
	viewsFromForYouShortVideos float,
	viewsFromOthers float,
	viewsFromShares float,
	viewsFromFollowing float,

	PRIMARY KEY(date),
	CONSTRAINT fk_tikTokManualEntry FOREIGN KEY (date) REFERENCES tikTokMaster(date)
);

CREATE TABLE IF NOT EXISTS tikTokCalculatedMetrics (
	date date UNIQUE,
	avgMinutesWatched double precision,	-- tikTokRawData.avgWatchTime / 60
	totalViewsPerMin int,			-- tikTokRawData.totalViews / (tikTokRawData.liveDuration / 60)
	uniqueViewersPerMin int,		-- tikTokRawData.uniqueViewers / (tikTokRawData.liveDuration / 60)
	diamondsPerMin double precision,	-- tikTokRawData.diamonds / (tikTokRawData.liveDuration / 60)
	giftersPerMin double precision,		-- tikTokRawData.gifters / (tikTokRawData.liveDuration / 60)
	diamondsPerGifter int,			-- tikTokRawData.diamonds / tikTokRawData.gifters 
	viewersPerGifter int,			-- tikTokRawData.uniqueViewers / tikTokRawData.gifters 
	newFollowersPerMin int,			-- tikTokRawData.newFollowers / (tikTokRawData.liveDuration / 60)
	viewersWhoCommentedPerMin int,		-- tikTokRawData.viewersWhoCommented / (tikTokRawData.liveDuration / 60)
	likesPerMin int,			-- tikTokRawData.likes / (tikTokRawData.liveDuration / 60)
	sharesPerMin int,			-- tikTokRawData.shares / (tikTokRawData.liveDuration / 60)
	viewerHours int,			-- [tikTokRawData.uniqueViewers * (tikTokRawData.liveDuration / 60)] / 60
	viewerHoursPerMin double precision,	-- tikTokCalculatedMetrics.viewerHours / (tikTokRawData.liveDuration / 60)
	conversionRate float, 			-- tikTokRawData.newFollowers / ( tikTokRawData.uniqueViewers - (tikTokRawData.uniqueViewers * tikTokManualEntry.followersWatchedLive))
	followerHourPortion float, 		-- (((tikTokManualEntry.followersWatchedLive * tikTokRawData.uniqueViewers) * followersAvgWatchTime) / 60) / tikTokCalculatedMetrics.viewerHours

	PRIMARY KEY(date),
	CONSTRAINT fk_tikTokManualEntry FOREIGN KEY (date) REFERENCES tikTokMaster(date)
);

-- test view, combines all the above tables into 1 view
CREATE VIEW masterView AS SELECT
    tm.date,
    cm.clientName,
    trd.totalViews,
    trd.uniqueViewers,
    trd.avgWatchTime,
    trd.topViewerCount,
    trd.newFollowers,
    trd.viewersWhoCommented,
    trd.likes,
    trd.shares,
    trd.diamonds,
    trd.gifters,
    trd.liveDuration,
    tme.startTime,
    tme.avgViewerCount,
    tme.followersWatchedLive,
    tme.followersSentGifts,
    tme.followersCommented,
    tme.followersAvgWatchTime,
    tme.othersAvgWatchTime,
    tme.viewsFromSuggestedLiveVideos,
    tme.viewsFromForYouShortVideos,
    tme.viewsFromOthers,
    tme.viewsFromShares,
    tme.viewsFromFollowing,
    tcm.avgMinutesWatched,
    tcm.totalViewsPerMin,
    tcm.uniqueViewersPerMin,
    tcm.diamondsPerMin,
    tcm.giftersPerMin,
    tcm.diamondsPerGifter,
    tcm.viewersPerGifter,
    tcm.newFollowersPerMin,
    tcm.viewersWhoCommentedPerMin,
    tcm.likesPerMin,
    tcm.sharesPerMin,
    tcm.viewerHours,
    tcm.viewerHoursPerMin,
    tcm.conversionRate,
    tcm.followerHourPortion
FROM
    tikTokMaster tm
    JOIN clientMaster cm ON tm.clientID = cm.clientID
    LEFT JOIN tikTokRawData trd ON tm.date = trd.date
    LEFT JOIN tikTokManualEntry tme ON tm.date = tme.date
    LEFT JOIN tikTokCalculatedMetrics tcm ON tm.date = tcm.date;


-- TEST DATA INSERT STATEMENTS

--INSERT INTO clientMaster (clientName)
--VALUES ('JNZ Productions'), ('Billy Lyell');



-- TEST RETURN STATEMENTS

--select * from clientMaster;
--select * from tikTokMaster;
--select * from tikTokRawData;
--select * from tikTokManualEntry;
--select * from tikTokCalculatedMetrics;

--select * from masterView;

--Update

CREATE OR REPLACE FUNCTION calculate_tikTokMetrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN
	INSERT INTO tikTokCalculatedMetrics 
		(date, avgMinutesWatched, totalViewsPerMin, uniqueViewersPerMin, diamondsPerMin, giftersPerMin, diamondsPerGifter, viewersPerGifter, newFollowersPerMin, viewersWhoCommentedPerMin, likesPerMin, sharesPerMin, viewerHours, viewerHoursPerMin)
	VALUES 
		(NEW.date, 
		NEW.avgWatchTime::numeric / 60, 
		NEW.totalViews::numeric / (NEW.liveDuration / 60),
		NEW.uniqueViewers::numeric / (NEW.liveDuration / 60),
		NEW.diamonds::numeric / (NEW.liveDuration / 60),
		NEW.gifters::numeric / (NEW.liveDuration / 60),
		NEW.diamonds::numeric / NEW.gifters,
		NEW.uniqueViewers::numeric / NEW.gifters,
		NEW.newFollowers::numeric / (NEW.liveDuration / 60),
		NEW.viewersWhoCommented::numeric / (NEW.liveDuration / 60),
		NEW.likes::numeric / (NEW.liveDuration / 60),
		NEW.shares::numeric / (NEW.liveDuration / 60),
		(NEW.uniqueViewers * (NEW.avgWatchTime::numeric / 60)) / 60,
		((NEW.uniqueViewers * (NEW.avgWatchTime::numeric / 60)) / 60) / (NEW.liveDuration / 60))

	ON CONFLICT (date) DO UPDATE

	SET avgMinutesWatched = EXCLUDED.avgMinutesWatched,
		totalViewsPerMin = EXCLUDED.totalViewsPerMin,
		uniqueViewersPerMin = EXCLUDED.uniqueViewersPerMin,
		diamondsPerMin = EXCLUDED.diamondsPerMin,
		giftersPerMin = EXCLUDED.giftersPerMin,
		diamondsPerGifter = EXCLUDED.diamondsPerGifter,
		viewersPerGifter = EXCLUDED.viewersPerGifter,
		newFollowersPerMin = EXCLUDED.newFollowersPerMin,
		viewersWhoCommentedPerMin = EXCLUDED.viewersWhoCommentedPerMin,
		likesPerMin = EXCLUDED.likesPerMin,
		sharesPerMin = EXCLUDED.sharesPerMin,
		viewerHours = EXCLUDED.viewerHours,
		viewerHoursPerMin = EXCLUDED.viewerHoursPerMin;

	RETURN NEW;
END;
$$;



CREATE TRIGGER trigger_tikTokMetrics_rawData
AFTER INSERT OR UPDATE OR DELETE ON tikTokRawData
FOR EACH ROW
EXECUTE PROCEDURE calculate_tikTokMetrics();