<?php
$delimiter = ';';
$properties = file("weaponproperties.txt");
$weapons = file("weapons.txt");
?>

<html>
<head>
	<link href='style.css' rel='stylesheet' type='text/css'>
	<link href='http://fonts.googleapis.com/css?family=Open+Sans+Condensed:300italic,700,300' rel='stylesheet' type='text/css'>
	<title>Magic Item Generation Tables</title>	
</head>
<body>
<div id="container">

<date class="date"><span>August.04.2015</span></date>
<h1>Tables of Properties</h1>
<author class="author"><span>By Len Pelletier</span></author>

<center><p><a href="index.php">HOME</a> | <a href="suggestions.html">SUGGEST A PROPERTY</a> | <a href="tables.php">RANDOM TABLES</a></p></center>

<p>Some people might want to adapt this generator to a pen-and-paper version to use in their game sessions, or perhaps you just want to read through the complete list of properties.  The following tables will allow you to do just that.  Enjoy!</p>

<h2>Weapon Properties</h2>

<table class="pure-table">
	<tr>
		<th>#</th>
		<th>Prefix</th>
		<th>Suffix</th>
		<th>Property</th>
	</tr>
<? 
$i = 0;
$evenOrOdd = "odd";
while ($i < count($properties)) {
	echo "<tr class=pure-table-$evenOrOdd>";
	$i = $i + 1;
	echo "<td>$i</td>";
	$i = $i - 1;
	$line = explode ($delimiter, $properties[$i]);
	echo "<td>{$line[0]}</td>";
	echo "<td>{$line[1]}</td>";
	echo "<td>{$line[2]}</td>";
	echo "</tr>";
	$i++;
	if ($evenOrOdd == "odd") {
		$evenOrOdd = "even";
	} else {
		$evenOrOdd = "odd";
	}
}
?>
</table>

<h2>Armor Properties</h2>

<table class="pure-table">
	<tr>
		<th>#</th>
		<th>Prefix</th>
		<th>Suffix</th>
		<th>Property</th>
	</tr>

<?
$delimiter = ';';
$properties = file("armorproperties.txt");
$weapons = file("armor.txt"); 
$i = 0;
$evenOrOdd = "odd";
while ($i < count($properties)) {
	echo "<tr class=pure-table-$evenOrOdd>";
	$i = $i + 1;
	echo "<td>$i</td>";
	$i = $i - 1;
	$line = explode ($delimiter, $properties[$i]);
	echo "<td>{$line[0]}</td>";
	echo "<td>{$line[1]}</td>";
	echo "<td>{$line[2]}</td>";
	echo "</tr>";
	$i++;
	if ($evenOrOdd == "odd") {
		$evenOrOdd = "even";
	} else {
		$evenOrOdd = "odd";
	}
}
?>
</table>

<h2>Trinket Properties</h2>

<table class="pure-table">
	<tr>
		<th>#</th>
		<th>Prefix</th>
		<th>Suffix</th>
		<th>Property</th>
	</tr>

<?
$delimiter = ';';
$properties = file("trinketproperties.txt");
$weapons = file("trinkets.txt"); 
$i = 0;
$evenOrOdd = "odd";
while ($i < count($properties)) {
	echo "<tr class=pure-table-$evenOrOdd>";
	$i = $i + 1;
	echo "<td>$i</td>";
	$i = $i - 1;
	$line = explode ($delimiter, $properties[$i]);
	echo "<td>{$line[0]}</td>";
	echo "<td>{$line[1]}</td>";
	echo "<td>{$line[2]}</td>";
	echo "</tr>";
	$i++;
	if ($evenOrOdd == "odd") {
		$evenOrOdd = "even";
	} else {
		$evenOrOdd = "odd";
	}
}
?>
</table>
</div>
</body>
</html>