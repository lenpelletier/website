public class Time { //Question 2.3
	
	public static void main(String[] args) {
		int hours   = 12;
		int minutes = 56;
		int seconds = 1;
		
		int secondsSinceMidnight = hours*3600 + minutes*60 + seconds; 
		System.out.println("Seconds since midnight: " + secondsSinceMidnight);
		
		int totalSecondsInDay = 24*3600;
		int secondsRemainingInDay = totalSecondsInDay - secondsSinceMidnight;
		System.out.println("Seconds remaining in day: " + secondsRemainingInDay);
		
		double percentDayElapsed = 100.0 * secondsSinceMidnight / totalSecondsInDay;
		System.out.println("Percentage of day elapsed: " + percentDayElapsed + "%");
		
		hours = 13;
		minutes = 2;
		seconds = 1;
		
		int newSecondsSinceMidnight = hours*3600 + minutes*60 + seconds;
		int questionDuration = newSecondsSinceMidnight - secondsSinceMidnight;
		System.out.println("I worked on this question for " + questionDuration + " seconds.");
	}
}
