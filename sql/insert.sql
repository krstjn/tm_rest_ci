insert into users(password, username, admin) values ('$2a$10$y2jWqSMSBZeLGELmn/j8o.bIFmYQDKO0mj.qCQpM8CdEQ3ZnN4v1e', 'admin', true);
insert into users(password, username) values ('$2y$12$sr1ziegIsn1bxigOGkOxo.kacYx/6tYBbb7sSJHmKJUBAYYsjXEk.', 'epli');
insert into users(password, username) values ('$2a$10$cXbPVYX.Qqmy91O4QP.IQuEFgc3DLCFHR4QmODhWdFa80R4WZv7du', 'rigning');

insert into tournaments(public, maxTeams, name, rounds, signupexpiration, sport, userId) values ('t',10,	'test2' ,2, null, 0,	1);
insert into tournaments(public, maxTeams, name, rounds, signupexpiration, sport, userId) values ('t',10,	'Ananas',2, null, 1,2);
insert into tournaments(public, maxTeams, name, rounds, signupexpiration, sport, userId) values ('t',10,	'Banani',2, null, 1,1);

insert into teams(name, tournamentId) values ('c', 1);
insert into teams(name, tournamentId) values ('d', 1);
insert into teams(name, tournamentId) values ('a', 1);
insert into teams(name, tournamentId) values ('b', 1);
insert into teams(name, tournamentId) values ('D', 2);
insert into teams(name, tournamentId) values ('A', 2);
insert into teams(name, tournamentId) values ('B', 2);
insert into teams(name, tournamentId) values ('C', 2);
insert into teams(name, tournamentId) values ('Q', 3);
insert into teams(name, tournamentId) values ('W', 3);
insert into teams(name, tournamentId) values ('E', 3);
insert into teams(name, tournamentId) values ('R', 3);
insert into teams(name, tournamentId) values ('T', 3);
insert into teams(name, tournamentId) values ('Y', 3);
