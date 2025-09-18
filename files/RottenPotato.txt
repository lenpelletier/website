public class RottenPotato {
    public static void main(String[] args) {

        int[][] ratings = { {4,6,2,5},
                {7,9,4,8},
                {6,9,3,7} };

        int rating0 = movieAvgRating(ratings, 0);                     
        System.out.println("Movie zero's average rating: " + rating0);                    
        int rating1 = movieAvgRating(ratings, 1); 
        System.out.println("Movie one's average rating: " + rating1);    
        System.out.println("Hardest reviewer is #" + hardestReviewer2018(ratings));
        System.out.println("Worst movie is #" + worstMovie2018(ratings));
    }

    //Question 1
    public static int movieAvgRating(int[][] ratings, int movie) {
        double sum = 0;
        for (int r = 0; r < ratings.length; r++)
            sum += ratings[r][movie];
        return (int)(sum/ratings.length);
    }

    //Question 2
    public static int reviewerAvgRating(int[][] ratings,int reviewer) {
        double sum = 0;
        for (int c = 0; c < ratings[0].length; c++)
            sum += ratings[reviewer][c];
        return (int)(sum/ratings[0].length);
    }

    //Question 3
    public static int avgRating2018(int[][] ratings) {
        double sum = 0;
        double numRatings = ratings.length * ratings[0].length;
        for (int r = 0; r < ratings.length; r++) {
            for (int c = 0; c < ratings[0].length; c++) {
                sum += ratings[r][c];
            }
        }

        return (int)(sum/numRatings);
    }

    //Question 4
    public static int hardestReviewer2018(int[][] ratings) {
        int hardestIndex = 0;
        int hardestAvg = reviewerAvgRating(ratings, 0);
        for (int r = 1; r < ratings.length; r++) {
            int newAvg =  reviewerAvgRating(ratings, r);
            if (newAvg < hardestAvg) {
                hardestIndex = r;
                hardestAvg = newAvg;
            }
        }
        return hardestIndex;
    }

    //question 5
    public static int worstMovie2018(int[][] ratings) {
        int worstIndex = 0;
        int worstAvg   = movieAvgRating(ratings, 0);
        for (int c = 1; c < ratings[0].length; c++) {
            int newAvg = movieAvgRating(ratings, c);
            if (newAvg < worstAvg) {
                worstIndex = c;
                worstAvg = newAvg;
            }
        }

        return worstIndex;
    }   
}
